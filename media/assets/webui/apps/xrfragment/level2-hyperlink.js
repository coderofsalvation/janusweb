/* XR URI Fragments spec (https://xrfragment.org)
 *
 * level2 explicit hyperlinks (embedded in 3D scenes/files) as per the XR URI Fragments spec
 * 
 * When clicking an href-value, the user(camera) is teleported/imported to the referenced object.
 * Usecases: spatial anchors, object imports, hyperlink bridge between JML<>3D files
 * see more: https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks
 */


elation.require([], function() {

  elation.extend('janusweb.hyperlink', class {
    constructor(object) {
      this.scene = elation.engine.instances.default.systems.world.scene['world-3d'] 
      this._object = object
      this.detectHrefs( this.scene )
      this.setupShroud()
    }

    setupShroud(){
      // show shroud when teleporting
      this.shroud = room.createObject('object', {
        id: 'sphere',
        scale: V(1),
        lighting: false,
        col: 'black',
        cull_face: 'none',
        depth_test: false,
        depth_write: false,
        shadow_cast: false,
        shadow_receive: false,
        renderorder: 1000,
        visible: false,
      });
      player.head.add(this.shroud._target); 

      // patch setPlayerPosition() with shroud animations during local teleports
      room.setPlayerPosition = (
        (original) => function(room){
          this.hyperlink.showShroud()
          return original.apply(this,room)
        }.bind(room)
      )(room.setPlayerPosition)
    }

    detectHrefs(scene){
      scene.traverse( (object) => {
        if( !object?.userData?.href || object.hasHref ) return

        const jobj = this.toJanusObject(object)
        jobj.addEventListener("click", () => this.execute(object.userData.href,{jobj,scene}) )
        object.hasHref = true
        //console.log('xrfragment: detect href in '+object.name)
      })
    }

    execute = function(href,opts){
      const {url,hash} = this.getUrlObject(href)
      console.log("hyperlink: "+href)
      elation.events.fire({element: this, type: 'href', data: {href,opts}});
      hash.forEach( (v,k) => {
        const {operator,param} = this.getOperators(k)
        switch( param ){
          case "t":    // W3C URI Time fragment not implemented (yet)
          case "loop": this._object.loop = operator != '-' 
          case "pos":  // legacy fallthrough
          default:     // level2: internal teleports/spawn
                       // https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks   
                       room.urlhash = v
                       if( this.scene.getObjectByName(v) ) room.setPlayerPosition()
                       // level2: animation triggers 
                       // https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks   
                       for( let i in this._object.children ){
                         const model = this._object.children[i]
                         if( model.animations && model.animations.map ){
                           model.animations.map( (a) => {
                             if( !String(a.name).toLowerCase() == String(v).toLowerCase() ) return 
                             console.log("xrfragment: activating animation '"+a.name+"'")
                             model.anim_id = a.name
                           })
                         }
                       }
                       return
                      break;
        }
      })

      const fullUrl = href.match(/^#/) ? `${room.url}${url.hash}` : url.href
      room.url = fullUrl
      if( !url.protocol.match(/^xrf:/) ){
        // level4: https://xrfragment.org/doc/RFC_XR_Fragments.html#xrf-uri-scheme
        janus.updateClientURL(fullUrl)
      }
      elation.events.fire({element: room, type: 'room_change', data: room});
    }

    getUrlObject = function(href){
      const url  = new URL( (href.match(/:\//) ? '' : document.location.origin+'/' ) + href)
      const hash = new URLSearchParams( String(url.hash).substr(1) ) 
      return {url,hash}
    }

    getOperators = function(k){
      let operator = ''
      // scan for operator
      if( k[0].match(/[-+]/) ){
        operator = k[0]
        k = k.substr(1)
      }
      return {operator,param:k}
    }

    toJanusObject = function(object){
      // we are not using object.parts[ ... ] because
      // glTF animated collidable objects require special sync/setup: 
      // collider must be child of THREE object (to get animated), not janusobject
      // NOTE: avoid jobj.add() since that reparents the object (andw breaks glTF anims)
      let jo = this._object.createObject("object",{
        js_id: object.name
      })
      object.parent.add( jo.objects['3d'] )
      jo.objects['3d'] = object
      jo.collidable = true
      jo.removeCollider();
      const collider = object.clone()
      collider.position.set(0,0,0)
      collider.rotation.set(0,0,0)
      collider.scale.set(1,1,1)
      jo.setCollider('mesh',{mesh: collider})
      jo.colliders.parent = object
      return jo
    }

    showShroud = function(){
      this.shroud.visible = true;
      this.shroud.opacity = 1;
    }

    update = function(){
      if (this.shroud?.visible) {
        if (this.shroud.opacity > .001) {
          this.shroud.opacity *= .9;
          if (this.shroud.opacity <= .001) {
            this.shroud.visible = false;
            this.shroud.opacity = 0;
          }
        }
      }
    }

  })
});

xrf_install_hyperlinks = function(){
 if( !room.hyperlink ){ 
   room.hyperlink = new elation.janusweb.hyperlink(room);
 }
}

xrf_install_hyperlinks()

// update urlbar when user or browser activates href 
elation.events.add(null, 'href', function(e){
  const scene  = elation.engine.instances.default.systems.world.scene['world-3d'] 
  const urlbar = document.querySelector('janus-ui-urlbar ui-input')
  const href   = e?.data?.href
  if( urlbar ){
    urlbar.value = href[0] == '#' ? urlbar.value.replace(/#.*/,'') + href : href
  }else console.warn("xrfragment: cannot find urlbar")
})

elation.events.add(null, 'room_load_complete', xrf_install_hyperlinks ) 
elation.events.add(null, 'janusweb_script_frame', function(){
  if( room?.hyperlink ) room.hyperlink.update()
})

if( room.urlhash ){ 
  elation.events.fire({element: this, type: 'href', data: {href: `#${room.urlhash}`}});
}
