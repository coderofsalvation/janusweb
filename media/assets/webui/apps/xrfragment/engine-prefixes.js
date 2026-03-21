// https://xrfragment.org/#%F0%9F%93%9Clevel7%3A%20engine%20prefixes
// There are cases where the 3D scene file might want to hint the 
// specific features to the viewer-engine (JANUSWEB, THREE.js, AFRAME, Godot e.g.). 

xrf_engines = function(){

  const {toJanusObject,applyPrefixes,applyCleanup} = xrf_engines
  let cleanup = []

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

                                     let opts    = {}// rotation: '0 -180 0' }
                                     opts.js_id = opts.name = opts.jsid = String(`-janus-${obj.name}_${obj.userData['-janus-tag']}`).replace(/.*janus-/,'-janus-')
                                     for( let i in obj.userData ){ 
                                       opts[ i.replace(/-janus-/,'') ] = obj.userData[i]
                                     }
                                     const jo = room.createObject( opts.tag, opts )
                                     jo.objects['3d'].name = opts.js_id
                                     jo.visible = false
                                      
                                     // replace janusobject with nested THREE obj
                                     // we need setTimeout otherwise quaternion is not updated 
                                     // https://github.com/jbaicoianu/janusweb/issues/306
                                     obj.parent.add( jo.objects['3d'] )
                                     setTimeout( () => {
                                       jo.orientation.copy( obj.quaternion)
                                       jo.position.copy( obj.position )
                                       jo.visible = true
                                     },200)
                                     // mark previously generated geo/materials by janusweb export for deletion
                                     obj.traverse ( (o) => cleanup.push(o) )
                                     cleanup.push(obj)
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
    }
  }

  room.gravity = 0 // new default unless specified otherwise
  let scene = elation.engine.instances.default.systems.world.scene['world-3d'] 
  applyPrefixes(scene,map)
  applyCleanup(cleanup)
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

xrf_engines.applyCleanup = function(cleanup){
  const clean = (o) => {
    if( o.geometry ) o.geometry.dispose()
    if( o.material ) o.material.dispose()
    o.removeFromParent()
  }
  cleanup.map(clean)
}


elation.events.add(null, 'room_load_complete', xrf_engines ) // future scenes
xrf_engines()                                                // current scene
