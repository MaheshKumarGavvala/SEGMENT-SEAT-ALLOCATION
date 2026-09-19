const express=require('express'),cors=require('cors'),bcrypt=require('bcryptjs'),crypto=require('crypto'),path=require('path');require('dotenv').config();
const {pool,checkDatabase}=require('./db');const {sign,requireAuth,requireAdmin}=require('./auth');
const app=express();app.use(cors());app.use(express.json());
const root=path.resolve(__dirname,'../..');
app.get('/api/health',async(req,res)=>{const db=await checkDatabase();res.status(db.ok?200:503).json({ok:db.ok,service:'Smart Segment Backend',database:db.ok?'connected':'unavailable',error:db.ok?null:db.message});});
app.post('/api/auth/register',async(req,res)=>{try{const {name,email,password}=req.body;const normalizedName=String(name||'').trim().toUpperCase();if(!normalizedName||!email||!password||password.length<6)return res.status(400).json({message:'Name, valid email and a 6+ character password are required.'});const hash=await bcrypt.hash(password,10);const [r]=await pool.query('INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)',[normalizedName,email.trim().toLowerCase(),hash,'user']);const user={id:r.insertId,name:normalizedName,email:email.trim().toLowerCase(),role:'user'};res.status(201).json({data:{...user,token:sign(user)}})}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({message:'An account with this email already exists.'});console.error(e);res.status(500).json({message:'Registration failed.'})}});
app.post('/api/auth/login',async(req,res)=>{try{const {email,password,role='user'}=req.body;const [rows]=await pool.query('SELECT * FROM users WHERE email=? AND role=?',[String(email||'').trim().toLowerCase(),role]);if(!rows.length||!(await bcrypt.compare(password||'',rows[0].password_hash)))return res.status(401).json({message:'Invalid email, password, or role.'});const u=rows[0],user={id:u.id,name:u.name,email:u.email,role:u.role};res.json({data:{...user,token:sign(user)}})}catch(e){console.error(e);res.status(500).json({message:'Login failed.'})}});
app.post('/api/auth/reset-password',async(req,res)=>{try{const {email,password}=req.body;if(!email||!password||password.length<6)return res.status(400).json({message:'Email and a 6+ character password are required.'});const hash=await bcrypt.hash(password,10);const [r]=await pool.query('UPDATE users SET password_hash=? WHERE email=?',[hash,email.trim().toLowerCase()]);if(!r.affectedRows)return res.status(404).json({message:'No account found for that email.'});res.json({message:'Password updated successfully.'})}catch(e){console.error(e);res.status(500).json({message:'Password reset failed.'})}});
app.get('/api/stops',async(req,res)=>{try{res.set('Cache-Control','no-store, max-age=0');const [rows]=await pool.query(`SELECT DISTINCT s.id,s.code,s.name,s.city,s.route_id,s.stop_order,r.code route_code,r.name route_name FROM stops s JOIN routes r ON r.id=s.route_id JOIN buses b ON b.route_id=s.route_id AND b.is_active=1 ORDER BY s.name ASC,s.city ASC,r.name ASC,s.stop_order ASC`);res.json({data:rows})}catch(e){console.error(e);res.status(500).json({message:'Could not load stops.'})}});
app.get('/api/buses/search',async(req,res)=>{try{const {from,to,date}=req.query;if(!from||!to)return res.status(400).json({message:'Boarding and destination are required.'});const [rows]=await pool.query(`SELECT b.id,b.operator_name name,b.bus_number number,b.service_number,b.bus_type type,b.total_seats,b.fare,b.departure,b.arrival,r.id route_id,r.code route_code,s1.id from_stop_id,s1.name from_name,s2.id to_stop_id,s2.name to_name FROM buses b JOIN routes r ON r.id=b.route_id JOIN stops s1 ON s1.route_id=r.id AND LOWER(s1.name)=LOWER(?) JOIN stops s2 ON s2.route_id=r.id AND LOWER(s2.name)=LOWER(?) WHERE b.is_active=1 AND s1.stop_order<s2.stop_order ORDER BY b.departure`,[from,to]);const data=await Promise.all(rows.map(async x=>{let seats=Number(x.total_seats);if(date){try{const a=await getAvailability(pool,x.id,x.route_id,x.from_stop_id,x.to_stop_id,date);seats=a.available_count}catch(_){}}return {...x,seats,route:{id:x.route_id,code:x.route_code},from:x.from_name,to:x.to_name,date:date||null}}));res.json({data})}catch(e){console.error(e);res.status(500).json({message:'Could not search buses.'})}});
async function getAvailability(conn,busId,routeId,fromId,toId,date){
  const [[bus]]=await conn.query('SELECT * FROM buses WHERE id=? AND route_id=? AND is_active=1',[busId,routeId]);
  if(!bus)throw new Error('Bus not found.');
  const [[from]]=await conn.query('SELECT * FROM stops WHERE id=? AND route_id=?',[fromId,routeId]);
  const [[to]]=await conn.query('SELECT * FROM stops WHERE id=? AND route_id=?',[toId,routeId]);
  if(!from||!to||from.stop_order>=to.stop_order)throw new Error('Invalid segment.');
  const [[lastStop]]=await conn.query('SELECT * FROM stops WHERE route_id=? ORDER BY stop_order DESC LIMIT 1',[routeId]);
  const [[firstStop]]=await conn.query('SELECT * FROM stops WHERE route_id=? ORDER BY stop_order LIMIT 1',[routeId]);
  if(!lastStop||!firstStop)throw new Error('Route stops are unavailable.');
  const span=Math.max(1,Number(lastStop.stop_order)-Number(firstStop.stop_order));
  const fare=Math.round(Number(bus.fare)*(Number(to.stop_order)-Number(from.stop_order))/span*100)/100;
  const [booked]=await conn.query(`SELECT bs.seat_number,s.stop_order a,t.stop_order b
    FROM booking_segments bs JOIN bookings bk ON bk.id=bs.booking_id
    JOIN stops s ON s.id=bs.from_stop_id JOIN stops t ON t.id=bs.to_stop_id
    WHERE bk.bus_id=? AND bk.travel_date=? AND bk.status='confirmed'`,[busId,date]);
  const locked=new Set();
  for(const x of booked) if(Math.max(from.stop_order,x.a)<Math.min(to.stop_order,x.b)) locked.add(Number(x.seat_number));
  const seats=Array.from({length:Number(bus.total_seats)},(_,i)=>({seat_number:i+1,status:locked.has(i+1)?'booked':'available'}));
  return {bus,from,to,fare,seats,available_count:seats.filter(s=>s.status==='available').length};
}
app.get('/api/segments/availability',async(req,res)=>{try{
  const x=await getAvailability(pool,Number(req.query.bus_id),Number(req.query.route_id),Number(req.query.from_stop_id),Number(req.query.to_stop_id),req.query.travel_date);
  res.json({data:x});
}catch(e){res.status(400).json({message:e.message})}});
app.get('/api/routes/:routeId/stops',async(req,res)=>{try{const [rows]=await pool.query('SELECT id,code,name,city,route_id,stop_order FROM stops WHERE route_id=? ORDER BY stop_order',[Number(req.params.routeId)]);res.json({data:rows})}catch(e){res.status(500).json({message:'Could not load route stops.'})}});
app.get('/api/bookings/mine',requireAuth,async(req,res)=>{
  const [rows]=await pool.query(`SELECT b.*,bu.operator_name bus_name,bu.bus_number,bu.service_number,bu.bus_type,bu.departure,bu.arrival,bu.fare bus_fare,
    bfs.name booking_from_name,bts.name booking_to_name,fs.name from_name,ts.name to_name,bs.seat_number,bs.from_stop_id segment_from_id,bs.to_stop_id segment_to_id,
    p.full_name,p.age,p.gender,p.mobile,p.email,p.id_proof_type,p.id_proof_number,
    pay.method,pay.status payment_status,pay.amount payment_amount,pay.transaction_ref
    FROM bookings b JOIN buses bu ON bu.id=b.bus_id
    LEFT JOIN stops bfs ON bfs.id=b.from_stop_id LEFT JOIN stops bts ON bts.id=b.to_stop_id
    LEFT JOIN booking_segments bs ON bs.booking_id=b.id
    LEFT JOIN stops fs ON fs.id=bs.from_stop_id LEFT JOIN stops ts ON ts.id=bs.to_stop_id
    LEFT JOIN passengers p ON p.booking_id=b.id AND p.segment_id=bs.id
    LEFT JOIN payments pay ON pay.booking_id=b.id
    WHERE b.user_id=? ORDER BY b.created_at DESC,bs.id`,[req.user.id]);
  const map={};
  for(const r of rows){
    if(!map[r.id]) map[r.id]={id:r.id,booking_code:r.booking_code,status:r.status,total_fare:Number(r.total_fare),travel_date:r.travel_date,from_stop:{name:r.booking_from_name},to_stop:{name:r.booking_to_name},bus:{name:r.bus_name,number:r.bus_number,service_number:r.service_number,type:r.bus_type,departure:r.departure,arrival:r.arrival,fare:Number(r.bus_fare||0)},passengers:[],payments:[]};
    if(r.seat_number) map[r.id].passengers.push({seat_number:r.seat_number,full_name:r.full_name,age:r.age,gender:r.gender,mobile:r.mobile,email:r.email,from_stop:{name:r.from_name},to_stop:{name:r.to_name}});
    if(r.transaction_ref&&!map[r.id].payments.some(x=>x.transaction_ref===r.transaction_ref)) map[r.id].payments.push({method:r.method,status:r.payment_status,amount:Number(r.payment_amount),transaction_ref:r.transaction_ref});
  }
  res.json({data:Object.values(map)});
});
app.patch('/api/bookings/:id/cancel',requireAuth,async(req,res)=>{
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<1)throw new Error('Invalid booking id.');
    const [[booking]]=await conn.query('SELECT id,booking_code,status,user_id FROM bookings WHERE id=? AND user_id=? FOR UPDATE',[id,req.user.id]);
    if(!booking)throw new Error('Booking not found.');
    if(booking.status==='cancelled')throw new Error('Booking is already cancelled.');
    if(booking.status!=='confirmed')throw new Error('Only confirmed bookings can be cancelled.');
    await conn.query("UPDATE bookings SET status='cancelled' WHERE id=?",[id]);
    await conn.commit();
    res.json({data:{id,booking_code:booking.booking_code,status:'cancelled'},message:'Booking cancelled successfully.'});
  }catch(e){
    await conn.rollback();
    console.error(e);
    res.status(400).json({message:e.message||'Could not cancel booking.'});
  }finally{conn.release()}
});
app.post('/api/payments/checkout',requireAuth,async(req,res)=>{
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const {bus_id,route_id,travel_date,method='UPI',passenger,segments=[],verification_code}=req.body;
  if(!bus_id||!route_id||!travel_date||!passenger||!segments.length)throw new Error('Booking information is incomplete.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(travel_date)))throw new Error('A valid travel date is required.');
  if(!passenger.full_name||!Number.isFinite(Number(passenger.age))||Number(passenger.age)<1||Number(passenger.age)>120||!passenger.gender||!/^\d{10}$/.test(String(passenger.mobile||''))||!passenger.id_proof_type||!passenger.id_proof_number)throw new Error('Complete valid passenger details are required.');
  if(!Array.isArray(segments)||segments.length>20)throw new Error('Invalid seat selection.');
  if(String(verification_code||'')!=='12345')throw new Error('Payment verification failed.');
  // Serialize checkouts for this bus so two users cannot book the same seat between availability check and insert.
  const [[bus]]=await conn.query('SELECT * FROM buses WHERE id=? AND route_id=? AND is_active=1 FOR UPDATE',[bus_id,route_id]);
  if(!bus)throw new Error('Selected bus is no longer available.');
  const [[routeStart]]=await conn.query('SELECT * FROM stops WHERE route_id=? ORDER BY stop_order LIMIT 1',[route_id]);
  const [[routeEnd]]=await conn.query('SELECT * FROM stops WHERE route_id=? ORDER BY stop_order DESC LIMIT 1',[route_id]);
  const checked=[];
  for(const s of segments){
    const x=await getAvailability(conn,bus_id,route_id,Number(s.from_stop_id),Number(s.to_stop_id),travel_date);
    const seat=Number(s.seat_number);
    if(x.seats.find(z=>z.seat_number===seat)?.status!=='available')throw new Error(`Seat ${seat} is no longer available for ${x.from.code} → ${x.to.code}.`);
    checked.push({s,x,seat});
  }
  // A seat may be reused only on non-overlapping journey sections.
  for(let i=0;i<checked.length;i++)for(let j=i+1;j<checked.length;j++){
    const a=checked[i],b=checked[j];
    if(a.seat===b.seat && Math.max(a.x.from.stop_order,b.x.from.stop_order)<Math.min(a.x.to.stop_order,b.x.to.stop_order))throw new Error(`Seat ${a.seat} is assigned to overlapping segments.`);
  }
  // The selected sections must form one continuous journey. The journey may be
  // a full route or a user-selected portion of the route (for example A → C).
  const sorted=[...checked].sort((a,b)=>a.x.from.stop_order-b.x.from.stop_order);
  for(let i=1;i<sorted.length;i++)if(sorted[i].x.from.stop_order!==sorted[i-1].x.to.stop_order)throw new Error('Selected segments must form a continuous journey without gaps.');
  const bookingFrom=sorted[0].x.from.id;
  const bookingTo=sorted.at(-1).x.to.id;
  const total=checked.reduce((n,z)=>n+Number(z.x.fare),0);
  const code='SS-'+crypto.randomBytes(4).toString('hex').toUpperCase();
  const [br]=await conn.query('INSERT INTO bookings(booking_code,user_id,bus_id,route_id,travel_date,from_stop_id,to_stop_id,status,total_fare) VALUES (?,?,?,?,?,?,?,?,?)',[code,req.user.id,bus_id,route_id,travel_date,bookingFrom,bookingTo,'confirmed',total]);
  for(const z of checked){
    const [sr]=await conn.query('INSERT INTO booking_segments(booking_id,seat_number,from_stop_id,to_stop_id,fare) VALUES (?,?,?,?,?)',[br.insertId,z.seat,z.x.from.id,z.x.to.id,z.x.fare]);
    await conn.query('INSERT INTO passengers(booking_id,segment_id,full_name,age,gender,mobile,email,id_proof_type,id_proof_number) VALUES (?,?,?,?,?,?,?,?,?)',[br.insertId,sr.insertId,String(passenger.full_name).trim().toUpperCase(),Number(passenger.age),String(passenger.gender).trim().toUpperCase(),String(passenger.mobile).trim(),passenger.email?String(passenger.email).trim().toLowerCase():null,String(passenger.id_proof_type).trim().toUpperCase(),String(passenger.id_proof_number).trim().toUpperCase()]);
  }
  const txn='TXN-'+crypto.randomBytes(5).toString('hex').toUpperCase();
  await conn.query('INSERT INTO payments(booking_id,method,status,amount,transaction_ref) VALUES (?,?,?,?,?)',[br.insertId,method,'paid',total,txn]);
  await conn.commit();
  res.status(201).json({data:{bookings:[{booking_code:code,status:'confirmed',total_fare:total,from_stop:{name:sorted[0].x.from.name},to_stop:{name:sorted.at(-1).x.to.name},travel_date,bus:{name:bus.operator_name,service_number:bus.service_number},passengers:checked.map(z=>({seat_number:z.seat,full_name:passenger.full_name,from_stop:{name:z.x.from.name},to_stop:{name:z.x.to.name}})),payments:[{method,status:'paid',amount:total,transaction_ref:txn}]}]}});
 }catch(e){await conn.rollback();console.error(e);res.status(400).json({message:e.message||'Checkout failed.'})}finally{conn.release()}
});
app.get('/api/admin/buses',requireAdmin,async(req,res)=>{try{const [rows]=await pool.query(`SELECT b.*,r.code route_code,r.name route_name,fs.name from_name,ts.name to_name FROM buses b JOIN routes r ON r.id=b.route_id LEFT JOIN stops fs ON fs.id=(SELECT id FROM stops WHERE route_id=b.route_id ORDER BY stop_order LIMIT 1) LEFT JOIN stops ts ON ts.id=(SELECT id FROM stops WHERE route_id=b.route_id ORDER BY stop_order DESC LIMIT 1) ORDER BY b.id DESC`);for(const b of rows){const [stops]=await pool.query('SELECT id,code,name,city,stop_order FROM stops WHERE route_id=? ORDER BY stop_order', [b.route_id]);b.stops=stops}res.json({data:rows})}catch(e){console.error(e);res.status(500).json({message:'Could not load buses.'})}});
app.post('/api/admin/buses',requireAdmin,async(req,res)=>{const conn=await pool.getConnection();try{await conn.beginTransaction();const {name,bus_number,service_number,bus_type='AC Sleeper',total_seats,fare,departure,arrival,route_id,route_code,route_name,stops=[]}=req.body;const normalized=Array.isArray(stops)?stops.map(x=>String(x).trim().toUpperCase()).filter(Boolean):[];if(!name||!bus_number||!service_number||!Number(total_seats)||!Number(fare)||!departure||!arrival||!Array.isArray(stops)||stops.length<2)throw new Error('Complete bus and route details are required.');let rid=Number(route_id)||0;if(!rid){const code=String(route_code||service_number).trim().toUpperCase();const rname=String(route_name||`${normalized?.[0]||stops[0]} → ${normalized?.at?.(-1)||stops.at(-1)}`).trim().toUpperCase();const [[existing]]=await conn.query('SELECT id FROM routes WHERE code=?',[code]);if(existing){
  rid=existing.id;
  const [existingStops]=await conn.query('SELECT name FROM stops WHERE route_id=? ORDER BY stop_order',[rid]);
  const requested=stops.map(x=>String(x).trim()).filter(Boolean);
  const same=existingStops.length===requested.length&&existingStops.every((x,i)=>String(x.name).trim().toLowerCase()===requested[i].toLowerCase());
  if(!same){
    const cloneCode=`${code}-${Date.now().toString().slice(-6)}`;
    const [rr]=await conn.query('INSERT INTO routes(code,name) VALUES(?,?)',[cloneCode,rname]);
    rid=rr.insertId;
  }
} else {const [rr]=await conn.query('INSERT INTO routes(code,name) VALUES(?,?)',[code,rname]);rid=rr.insertId}}
else {const [[r]]=await conn.query('SELECT id FROM routes WHERE id=?',[rid]);if(!r)throw new Error('Selected route was not found.');}
for(let i=0;i<normalized.length;i++){const [[found]]=await conn.query('SELECT id FROM stops WHERE route_id=? AND LOWER(name)=LOWER(?)',[rid,normalized[i]]);if(!found){const code=`S${rid}-${i+1}`;await conn.query('INSERT INTO stops(code,name,city,route_id,stop_order) VALUES(?,?,?,?,?)',[code,normalized[i],normalized[i],rid,i+1])}else await conn.query('UPDATE stops SET stop_order=?,city=? WHERE id=?',[i+1,normalized[i],found.id])}
const [r]=await conn.query('INSERT INTO buses(operator_name,bus_number,service_number,bus_type,total_seats,fare,departure,arrival,is_active,route_id) VALUES(?,?,?,?,?,?,?,?,?,?)',[String(name).trim().toUpperCase(),String(bus_number).trim().toUpperCase(),String(service_number).trim().toUpperCase(),String(bus_type).trim().toUpperCase(),Number(total_seats),Number(fare),departure,arrival,1,rid]);await conn.commit();res.status(201).json({data:{id:r.insertId}})}catch(e){await conn.rollback();console.error(e);res.status(e.code==='ER_DUP_ENTRY'?409:400).json({message:e.code==='ER_DUP_ENTRY'?'Bus/service number already exists.':e.message||'Could not create bus.'})}finally{conn.release()}});
app.put('/api/admin/buses/:id',requireAdmin,async(req,res)=>{
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const id=Number(req.params.id);
  const {name,bus_number,service_number,bus_type,total_seats,fare,departure,arrival,is_active,stops=[]}=req.body;
  const [[b]]=await conn.query('SELECT * FROM buses WHERE id=? FOR UPDATE',[id]);
  if(!b)throw new Error('Bus not found.');
  const normalized=Array.isArray(stops)?stops.map(x=>String(x).trim().toUpperCase()).filter(Boolean):[];
  if(!name||!bus_number||!service_number||!Number(total_seats)||!Number(fare)||!departure||!arrival||normalized.length<2)throw new Error('Complete bus and route details are required.');

  const [[routeUsage]]=await conn.query('SELECT COUNT(*) count FROM buses WHERE route_id=?',[b.route_id]);
  const [[bookingUsage]]=await conn.query('SELECT COUNT(*) count FROM bookings WHERE route_id=?',[b.route_id]);
  const [oldStops]=await conn.query('SELECT id,name,city,code,stop_order FROM stops WHERE route_id=? ORDER BY stop_order',[b.route_id]);

  // A route must be cloned before structural edits when it is shared, has booking history,
  // or its number of stops changes. This preserves existing bookings and other buses.
  const mustClone=Number(routeUsage.count)>1 || Number(bookingUsage.count)>0 || oldStops.length!==normalized.length;
  let routeId=b.route_id;

  if(mustClone){
    const [[oldRoute]]=await conn.query('SELECT * FROM routes WHERE id=?',[b.route_id]);
    const baseCode=String(oldRoute?.code||service_number).trim().toUpperCase();
    const cloneCode=`${baseCode}-${Date.now().toString().slice(-6)}`;
    const rname=`${normalized[0]} → ${normalized.at(-1)}`;
    const [rr]=await conn.query('INSERT INTO routes(code,name) VALUES(?,?)',[cloneCode,rname]);
    routeId=rr.insertId;
    for(let i=0;i<normalized.length;i++){
      const code=`S${routeId}-${i+1}`;
      await conn.query('INSERT INTO stops(code,name,city,route_id,stop_order) VALUES(?,?,?,?,?)',[code,normalized[i],normalized[i],routeId,i+1]);
    }
    await conn.query('UPDATE buses SET route_id=? WHERE id=?',[routeId,id]);
  }else{
    // Same route, no bookings and same number of stops: update each existing stop by position.
    // The stop's ID/code remains stable; changing its name never creates a duplicate Sx-y row.
    for(let i=0;i<normalized.length;i++){
      const existing=oldStops[i];
      if(existing){
        await conn.query('UPDATE stops SET name=?,city=?,stop_order=? WHERE id=?',[normalized[i],normalized[i],i+1,existing.id]);
      }else{
        const code=`S${routeId}-${i+1}`;
        await conn.query('INSERT INTO stops(code,name,city,route_id,stop_order) VALUES(?,?,?,?,?)',[code,normalized[i],normalized[i],routeId,i+1]);
      }
    }
  }

  await conn.query('UPDATE routes SET name=? WHERE id=?',[`${normalized[0]} → ${normalized.at(-1)}`,routeId]);
  await conn.query('UPDATE buses SET operator_name=?,bus_number=?,service_number=?,bus_type=?,total_seats=?,fare=?,departure=?,arrival=?,is_active=? WHERE id=?',[String(name).trim().toUpperCase(),String(bus_number).trim().toUpperCase(),String(service_number).trim().toUpperCase(),String(bus_type).trim().toUpperCase(),Number(total_seats),Number(fare),departure,arrival,is_active?1:0,id]);
  await conn.commit();
  res.json({message:'Bus service updated successfully.'});
 }catch(e){
  await conn.rollback();
  console.error(e);
  res.status(e.code==='ER_DUP_ENTRY'?409:400).json({message:e.code==='ER_DUP_ENTRY'?'Bus/service number already exists.':e.message||'Could not update bus.'});
 }finally{conn.release()}
});
app.patch('/api/admin/buses/:id/status',requireAdmin,async(req,res)=>{try{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({message:'Invalid bus id.'});if(typeof req.body.is_active!=='boolean'&&req.body.is_active!==0&&req.body.is_active!==1&&req.body.is_active!=='0'&&req.body.is_active!=='1')return res.status(400).json({message:'is_active must be true or false.'});const active=(req.body.is_active===true||req.body.is_active===1||req.body.is_active==='1')?1:0;const [r]=await pool.query('UPDATE buses SET is_active=? WHERE id=?',[active,id]);if(!r.affectedRows)return res.status(404).json({message:'Bus not found.'});res.json({data:{id,is_active:Boolean(active)},message:active?'Bus activated successfully.':'Bus deactivated successfully.'})}catch(e){console.error(e);res.status(500).json({message:'Could not update bus status.'})}});
app.delete('/api/admin/buses/:id',requireAdmin,async(req,res)=>{
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const id=Number(req.params.id);
  const [[b]]=await conn.query('SELECT id,route_id,is_active FROM buses WHERE id=? FOR UPDATE',[id]);
  if(!b)throw new Error('Bus not found.');
  if(Number(b.is_active)===1)throw new Error('Only inactive buses can be deleted. Deactivate this bus first.');

  // Delete is allowed only for inactive buses.
  // If this bus has test/booking history, remove that bus's dependent booking
  // records first so MySQL foreign keys cannot block the bus deletion.
  // booking_segments, passengers and payments are linked to bookings with
  // ON DELETE CASCADE, so their dependent rows are cleaned up automatically.
  const [[bk]]=await conn.query('SELECT COUNT(*) count FROM bookings WHERE bus_id=?',[id]);
  const bookingCount=Number(bk.count)||0;
  if(bookingCount>0){
    await conn.query('DELETE FROM bookings WHERE bus_id=?',[id]);
  }

  // Delete the bus itself. This is now safe because its booking rows are gone.
  const [r]=await conn.query('DELETE FROM buses WHERE id=?',[id]);
  if(!r.affectedRows)throw new Error('Bus could not be deleted.');

  // Delete the route only when no other bus uses it. Its stops are then
  // removed by the existing routes -> stops ON DELETE CASCADE constraint.
  const [[usage]]=await conn.query('SELECT COUNT(*) count FROM buses WHERE route_id=?',[b.route_id]);
  if(Number(usage.count)===0){
    await conn.query('DELETE FROM routes WHERE id=?',[b.route_id]);
  }

  await conn.commit();
  res.json({message:bookingCount>0
    ? `Bus deleted successfully. ${bookingCount} booking record(s) were also removed with this bus.`
    : 'Bus deleted successfully.'
  });
 }catch(e){
  await conn.rollback();
  console.error(e);
  res.status(e.message.includes('booking history')?409:400).json({message:e.message||'Could not delete bus.'});
 }finally{conn.release()}
});
app.get('/api/admin/bookings',requireAdmin,async(req,res)=>{try{const [rows]=await pool.query(`SELECT b.id,b.booking_code,b.travel_date,b.status,b.total_fare,b.created_at,bu.operator_name bus_name,bu.service_number,r.code route_code,fs.name from_name,ts.name to_name,bs.seat_number,ss.name seg_from_name,st.name seg_to_name,p.full_name,p.age,p.gender,p.mobile,p.email,p.id_proof_type,p.id_proof_number,pay.method payment_method,pay.status payment_status,pay.transaction_ref FROM bookings b JOIN buses bu ON bu.id=b.bus_id JOIN routes r ON r.id=b.route_id LEFT JOIN stops fs ON fs.id=b.from_stop_id LEFT JOIN stops ts ON ts.id=b.to_stop_id LEFT JOIN booking_segments bs ON bs.booking_id=b.id LEFT JOIN stops ss ON ss.id=bs.from_stop_id LEFT JOIN stops st ON st.id=bs.to_stop_id LEFT JOIN passengers p ON p.segment_id=bs.id LEFT JOIN payments pay ON pay.booking_id=b.id ORDER BY b.created_at DESC,bs.id`);const map={};for(const x of rows){if(!map[x.id])map[x.id]={id:x.id,code:x.booking_code,date:x.travel_date,status:x.status,fare:Number(x.total_fare),created_at:x.created_at,route:`${x.from_name||''} → ${x.to_name||''}`,bus:x.bus_name,service_number:x.service_number,passenger:x.full_name||'—',mobile:x.mobile||'—',segments:[],payment:x.payment_status||'—'};if(x.seat_number)map[x.id].segments.push({seat:x.seat_number,from:x.seg_from_name,to:x.seg_to_name,passenger:x.full_name||'—'});}res.json({data:Object.values(map)})}catch(e){console.error(e);res.status(500).json({message:'Could not load bookings.'})}});
app.get('/api/admin/stats',requireAdmin,async(req,res)=>{try{const [[fleet]]=await pool.query('SELECT COUNT(*) total, SUM(is_active=1) active, COALESCE(SUM(total_seats),0) seats, COALESCE(AVG(fare),0) avg_fare FROM buses');const [[bk]]=await pool.query("SELECT COUNT(*) bookings, COALESCE(SUM(total_fare),0) revenue FROM bookings WHERE status='confirmed'");res.json({data:{...fleet,...bk}})}catch(e){res.status(500).json({message:'Could not load dashboard stats.'})}});
app.use(express.static(root,{index:false,fallthrough:true,setHeaders:(res,filePath)=>{if(/\.html$/i.test(filePath)){res.setHeader('Cache-Control','no-store')}}}));
app.get('/',(req,res)=>res.sendFile(path.join(root,'index.html')));
app.use((req,res,next)=>{ if(req.path.startsWith('/api/')) return next(); res.status(404).send('Page not found'); });
app.use((err,req,res,next)=>{ console.error(err); res.status(500).send('Server error'); });
const port=Number(process.env.PORT||3000);
app.listen(port,async()=>{
  console.log(`Smart Segment running at http://localhost:${port}`);
  const db=await checkDatabase();
  if(db.ok) console.log('MySQL connection: OK');
  else console.error(`MySQL connection: FAILED (${db.code || 'UNKNOWN'}): ${db.message}`);
});
