/* XR URI Fragments spec (https://xrfragment.org)
 *
 * level4 operators per the XR URI Fragments spec
 * 
 * https://xrfragment.org/#%F0%9F%93%9C%20level4%3A%20operators
 *
 * overlays: https://xrfragment.org/#%23!
 */

export default function init(elation,room,opts){
    
  // default https://xrfragment.org/#%F0%9F%93%9Clevel8%3A%20XR%20classes
  const defaultHints = 'vr ar portal embed hide collection'
  const classList      = defaultHints.split(' ')

  let xrf_install_xrhints 
  xrf_install_xrhints = function(room){
    if( room.xrhints_installed ) return

    let client         = janus.engine.client

    function getContext(room){
      let context = room.className ? room.classList : ['vr']
      const render        = room.engine.systems.render
      let   mode          = xrf_install_xrhints.xrmode
      const session       = janus.engine.client?.xrplayer?.session ||
                            render.views.xr?.xrsession
      if( session || mode){
        context = []
        mode = mode || session.mode
        // WebXR Polyfill fallback for convenient debugging 
        if( !mode ){
          try {
              const symbols = Object.getOwnPropertySymbols(session);
              for (const sym of symbols) {
                  if (sym.toString().includes("@@webxr-polyfill/XRSession")) {
                      const internalState = session[sym];
                      if (internalState && internalState.mode) {
                          mode = internalState.mode;
                      }
                  }
              }
          } catch (e) {}
        }
        if( mode == 'immersive-vr' ) context = ['vr']
        if( mode == 'immersive-ar' ) context = ['ar']
        if( room.nested ){
          const embedded = room.nested.url_pos || room.nested.url_scale || room.nested.url_rotation
          context.push( embedded ? 'embed' : 'portal')
        }
      }
      context = window.testhint || context
      console.log('context = ' + context.join(' '))
      document.title = context.join(' ')
      return context
    }

    function getClassList(child,opts){
      let childClassList = []
      if( opts.janus && child.classList && child.classList.length > 0 ){
        childClassList = child.classList
      }
      if( opts.three && child.userData['class'] ){
        childClassList = child.userData['class'].split(" ")
      }
      childClassList = childClassList.filter( (c) => c ) // sometimes janusweb gives empty elements
      return childClassList
    }

    function traverseJanusObjects(children,cb,seen){
      children = children || []
      seen     = seen || {}
      for( let i in children){
        const child = children[i]
        cb(child)
        if( Object.keys(child.children || {}).length > 0 ){
          traverseJanusObjects(child.children,cb,seen)
        }
      }
    }

    // universal XR classes https://xrfragment.org/#%F0%9F%93%9Clevel8%3A%20XR%20classes
    function applyXRHints(opts){
      // apply to JanusRoom objects
      traverseJanusObjects( room.objects, (child) => {
        opts.callbacks.map( (cb) => cb(child, { ...opts, janus:true}) )
      })
      // apply to THREE objects
      if( elation?.engine?.instances?.default?.systems?.world?.scene ){
        let scene = elation.engine.instances.default.systems.world.scene['world-3d']
        scene.traverse( (o) => {
          opts.callbacks.map( (cb) => cb(o, { ...opts, three:true}) )
        })
      }
    }

    function applyXRLayers(child,opts){
      const isXRLayer    = (a,b) => a.filter( (className) => ~b.indexOf(className) ).length > 0
      let visible = true 
      let childClassList = getClassList(child,opts)
      if( childClassList.length ){
        if( isXRLayer( childClassList, classList ) ){
          visible = isXRLayer( childClassList, opts.context )
        }
      }
      if( child.visible != visible ){ 
        const update = (child,state) => child.visible = state
        update(child, visible) // works for both janus+three objects
        // also apply to children (janus=markup) (three=three objects)
        if( opts.janus ) traverseJanusObjects( child.children, (c) => update(c,visible) )
        if( opts.three ) child.traverse( (c) => update(c,visible) )
      }
    }

    // https://xrfragment.org/#%F0%9F%93%9Clevel3%3A%20XR%20hints
    function applyOccludable(child,opts){
      const childClassList = getClassList(child,opts)
      if( childClassList && ~childClassList.indexOf('occludable') ){
        // dont write to colorbuffer
        if( opts.three && child.material ) child.material.colorWrite = false
        // render as first thing
        if( opts.janus ){ 
          child.layer       = -1000
          child.color_write = false
          setTimeout( () => {
            child.objects['3d'].traverse( (o) => {
              o.renderOrder = -1000  
            })
          }, 100)
          // for janusobjects disable culling if culling is not set
          if( ! child.args.properties?.cull_face ){
            child.cull_face   = 'none'
          }
        }
        if( opts.three   ) child.renderOrder = -1000
      }
    }

    function startAnimation(room){
      try{
        const animations = room.objects.scene.modelasset.animations
        if( animations.length == 1 ){
          room.objects.scene.modelasset.instances[0].userData.thing.anim_id = animations[0].name
        } 
      }catch(e){ console.log("no single-animation found") }
    }

    startAnimation(room)
    applyXRHints({ 
      context:   getContext(room),
      callbacks: [ applyXRLayers, applyOccludable ]
    })

    if( !xrf_install_xrhints.installed ){
      let startXR        = janus.engine.client.startXR
      janus.engine.client.startXR = function(mode){
        xrf_install_xrhints.xrmode = mode || 'immersive-vr'
        startXR.apply(janus.engine.client,[mode])
      }
      elation.events.add(null, 'xrsessionstart', (e) => {
        applyXRHints({ context:   getContext(room), callbacks: [ applyXRLayers ]})
      })
      elation.events.add(null, 'xrsessionend', (e) => {
        xrf_install_xrhints.xrmode = false
        applyXRHints({ context:   getContext(room), callbacks: [ applyXRLayers ]})
      })
      xrf_install_xrhints.installed = true
    }

    room.xrhints_installed = true
  }

  elation.events.add(null, 'room_load_complete', (e) => {
    xrf_install_xrhints(room) 
  })

}
