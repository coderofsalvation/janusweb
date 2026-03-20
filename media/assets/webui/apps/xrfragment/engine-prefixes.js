// https://xrfragment.org/#%F0%9F%93%9Clevel7%3A%20engine%20prefixes
// There are cases where the 3D scene file might want to hint the 
// specific features to the viewer-engine (JANUSWEB, THREE.js, AFRAME, Godot e.g.). 

xrf_engines = function(){

  const {toJanusObject,applyPrefixes} = xrf_engines

  const map = (obj,key,realKey) => {
    let match = true 

    // special cases
    switch( key ){
      case "-three-material.blending": if( obj.material ){
                                         const modes = {
                                           'THREE.NoBlending':          THREE.NoBlending,
                                           'THREE.NormalBlending':      THREE.NormalBlending,
                                           'THREE.AdditiveBlending':    THREE.AdditiveBlending,
                                           'THREE.SubtractiveBlending': THREE.SubtractiveBlending,
                                           'THREE.MultiplyBlending':    THREE.MultiplyBlending
                                         }
                                         if( modes[ obj.userData[key] ] ) obj.material.blending = modes[ obj.userData[key] ]
                                       }
                                       break;

      case "-janus-use_local_asset": room.use_local_asset = obj.userData[key]
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
      case "-janus-tag":             

                                     let opts    = {}
                                     opts.js_id = String(`-janus-${obj.name}_${obj.userData['-janus-tag']}`).replace('janus--janus','')
                                     for( let i in obj.userData ){ 
                                       opts[ i.replace(/-janus-/,'') ] = obj.userData[i]
                                     }
                                     const jo = room.createObject( opts.tag, opts )
                                     jo.objects['3d'].name = opts.js_id
                                     obj.getWorldPosition(jo.position)
                                     jo.quaternion.copy( obj.quaternion )
                                     obj.parent.remove(obj)
                                     break;
      // OBJECTS
      case "-janus-collision_id":    const collision_id = obj.userData[key]
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

      default:                      match = false                     
               
                                    // JANUS fallthrough
                                    if( key.match(/^-janus-/) ){
                                      // *TODO* more heuristics to determine scene
                                      if( obj.name == 'Scene' || obj?.parent?.name == '' || obj.userData['-janus-source']){ 
                                        room[realKey] = obj.userData[key];
                                      }else{
                                        toJanusObject(obj)[realKey] = obj.userData[key]
                                      }
                                      match = true
                                    }

                                    // THREE fallthrough
                                    if( key.match(/^-three-/) ){
                                      if( key.match(/-material\./) ){
                                        if( obj.material ) obj.material[ realKey.replace('material.','') ] = obj.userData[key];
                                      }else{
                                        obj[realKey] = obj.userData[key];
                                      }
                                      match = true
                                    }
    }

    if( match ){
      console.log(`xrfragment: engine prefix '${key}:${realKey}' = '${obj.userData[key]}'`)
      debugger
    }
  }

  room.gravity = 0 // new default
  let scene = elation.engine.instances.default.systems.world.scene['world-3d'] 
  applyPrefixes(scene,map)
}


xrf_engines.toJanusObject = function(obj,opts){
  opts = opts || {}
  opts.tag = opts.tag || 'object'
  const create = () => room.createObject( opts.tag,{ js_id: obj.name, ...opts })
  let jo = room.objects[ obj.name] || create()
  jo.objects['3d'] = obj
  return jo
}

xrf_engines.applyPrefixes = function(scene,map){
  scene.traverse( (obj) => {
    for( let field in obj.userData ){
      if( obj.userData[field] ){ 
        try{
          map(obj,field, field.replace(/^-(janus|three)-/,'') )
        }catch(e){ console.error(e) }
      }
    }
  })
}

elation.events.add(null, 'room_load_complete', xrf_engines ) // future scenes
xrf_engines()                                                // current scene
