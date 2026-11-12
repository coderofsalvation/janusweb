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

  xrf_install_xrhints = function(){
    let startXR        = janus.engine.client.startXR 
    let client         = janus.engine.client

    function getContext(){
      let context = this.className ? this.classList : ['vr']

      const render        = this.engine.systems.render
      const session       = janus.engine.client?.xrplayer?.session
      if( session && render?.renderer?.xr?.isPresenting ){
        context = []
        let mode = session.mode
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
        if( mode == 'immersive-ar' ) context = ['ar']
        if( this.nested ){
          const embedded = this.nested.url_pos || this.nested.url_scale || this.nested.url_rotation
          context.push( embedded ? 'embed' : 'portal')
        }
      }
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
      const hasOverlap    = (a,b) => a.filter( (className) => ~b.indexOf(className) ).length > 0
      let visible = true 
      const childClassList = getClassList(child,opts)
      if( childClassList.length ){
        if( hasOverlap( childClassList, classList ) ){
          visible = hasOverlap( childClassList, opts.context )
        }
      }
      if( child.visible && !visible ){ 
        const hide = (child) => child.visible = false
        hide(child) // hidden in this context (works for both janus+three objects)
        // also apply to children (janus=markup) (three=three objects)
        if( opts.janus ) traverseJanusObjects( child.children, hide )
        if( opts.three ) child.traverse( hide )
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

    function startAnimation(){
      try{
        const animations = room.objects.scene.modelasset.animations
        if( animations.length == 1 ){
          room.objects.scene.modelasset.instances[0].userData.thing.anim_id = animations[0].name
        } 
      }catch(e){ console.log("no single-animation found") }
    }

    applyXRHints({ 
      context:   getContext.apply(room),
      callbacks: [ applyXRLayers, applyOccludable ]
    })
    startAnimation()

    if( !client.startXR.xrhints ){
     client.startXR = function(mode,opts){
        startXR.apply(client, [mode,opts])
        //setTimeout( () => applyXRLayers.apply(room), 100 )
      }
    }

  }

  elation.events.add(null, 'room_load_complete', xrf_install_xrhints )

}
