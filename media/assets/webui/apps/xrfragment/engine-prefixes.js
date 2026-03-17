// https://xrfragment.org/#%F0%9F%93%9Clevel7%3A%20engine%20prefixes
// There are cases where the 3D scene file might want to hint the 
// specific features to the viewer-engine (JANUSWEB, THREE.js, AFRAME, Godot e.g.). 

xrf_init_engines = function(){

  const {toJanusObject} = xrf_lib

  const map = (obj,key,janusKey) => {
    console.log(`xrfragment: engine-prefix '${key}' => '${janusKey}' = '${obj.userData[key]}'`)

    switch( key ){

      // ROOM key:string
      case "-JANUS-skybox":          
      case "-JANUS-tonemapping_type":
      case "-JANUS-fog_mode":        
      case "-JANUS-fog_col":         room[janusKey] = obj.userData[key]; break;

      // ROOM key:float
      case "-JANUS-gravity":         
      case "-JANUS-fog_density":     
      case "-JANUS-fog_start":       
      case "-JANUS-fog_end":         
      case "-JANUS-near_dist":       
      case "-JANUS-tonemapping_exposure":
      case "-JANUS-far_dist":        
      case "-JANUS-walkspeed":       
      case "-JANUS-runspeed":        
      case "-JANUS-jump_velocity":   
      case "-JANUS-bloom":           room[janusKey]     = parseFloat(obj.userData[key]); break;

      case "-JANUS-fog":             
      case "-JANUS-defaultlights":   
      case "-JANUS-shadows":         
      case "-JANUS-flying":          
      case "-JANUS-teleport":        
      case "-JANUS-locked":          
      case "-JANUS-col":             
      case "-JANUS-sync":            
      case "-JANUS-private":         room[janusKey]     = obj.userData[key] == 'false' ? true : false; break;

      case "-JANUS-use_local_asset": room.use_local_asset = obj.userData[key]
                                     room.localasset = room.createObject('object', {
                                       id: room.use_local_asset,
                                       collision_id: room.use_local_asset + '_collision',
                                       collision_scale: V(1,1,1),
                                       collision_pos: V(0,0,0),
                                       col: room.col,
                                       //fwd: room.fwd,
                                       xdir: room.xdir,
                                       ydir: room.ydir,
                                       zdir: room.zdir,
                                       shadows: true
                                     });
                                     break;
      // DECLARATIVE entities
      case "-JANUS-tag":             opts = {}
                                     // todo map opts
                                     room.createObject( obj[janusKey], opts )
                                     break;
      // OBJECTS
      case "-JANUS-billboard":       toJanusObject(obj)[janusKey] = obj.userData[key]; break;

      case "-JANUS-collision_id":    const collision_id = obj.userData[key]
                                    if( collision_id != obj.name ){
                                      console.warn(`xrfragment: ${obj.name}.collision_id can be '${obj.name}' only (for now)..skipping '${collision_id}'`)
                                    }else{
                                      const jo = toJanusObject(obj,{noreparent:true})
                                      jo.collidable = true
                                      jo.collision_id = collision_id
                                      jo.removeCollider();
                                      const collider = obj.clone()
                                      collider.position.set(0,0,0)
                                      collider.rotation.set(0,0,0)
                                      collider.scale.set(1,1,1)
                                      jo.collision_trigger = true
                                      jo.setCollider('mesh',{mesh: collider})
                                      jo.colliders.parent = obj
                                      //jo.objects.dynamics.mass = 1
                                      //jo.objects.dynamics.addForce('static', new THREE.Vector3(0, room.gravity, 0));
                                      //elation.events.add(jo.objects.dynamics, 'physics_collide', elation.bind(jo, jo.handleCollision));
                                      console.log(`xrfragment: setting collision_id = ${collision_id}`)
                                    }
                                    break;
    }
  }

  room.gravity = 0 // new default
  this.scene = elation.engine.instances.default.systems.world.scene['world-3d'] 
  this.scene.traverse( (obj) => {
    for( let field in obj.userData ){
      if( obj.userData[field] ){ 
        try{
          map(obj,field, field.replace(/^-(JANUS|THREE3|THREE)-/,'') )
        }catch(e){ console.error(e) }
      }
    }
  })
}

elation.events.add(null, 'room_load_complete', xrf_init_engines ) // future scenes
xrf_init_engines()                                                // current scene
