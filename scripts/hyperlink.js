/* level2 explicit hyperlinks (embedded in 3D scenes/files) as per the XR URI Fragments spec
 * 
 * When clicking an href-value, the user(camera) is teleported/imported to the referenced object.
 * Usecases: spatial anchors, object imports, hyperlink bridge between JML<>3D files
 * see more: https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks
 */

elation.require([], function() {

  elation.extend('janusweb.hyperlink', class {
    constructor(object) {
      this._object = object
      this.detectHrefs( object.modelasset.instances[0] )
    }

    detectHrefs = function(scene){
      scene.traverse( (object) => {
        if( !object?.userData?.href || object.hasHref ) return

        const jobj = this.toJanusObject(object)
        jobj.addEventListener("click", () => this.execute(object.userData.href,{jobj,scene}) )
        object.hasHref = true

      })
    }

    execute = function(href,opts){
      const {url,hash} = this.getUrlObject(href)
      console.log("hyperlink: "+href)
      hash.forEach( (v,k) => {
        const {operator,param} = this.getOperators(k)
        switch( param ){
          case "t":    // W3C URI Time fragment not implemented (yet)
          case "loop": this._object.loop = operator != '-' 
          case "pos":  // legacy fallthrough
          default:     // level2: internal teleports/spawn
                       // https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks   
                       room.urlhash = v
                       room.setPlayerPosition()
                       // level2: animation triggers 
                       // https://xrfragment.org/#%F0%9F%93%9C%20level2%3A%20explicit%20hyperlinks   
                       if( this._object.modelasset.animations ){
                         this._object.modelasset.animations.map( (a) => {
                           if( !String(a.name).toLowerCase() == String(v).toLowerCase() ) return 
                           this._object.anim_id = a.name
                         })
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
      let jobj = this._object.createObject("object",{
        js_id: object.name
      })
      jobj.objects['3d'] = object
      jobj.collidable = true
      jobj.removeCollider();
      const collider = object.clone()
      collider.position.set(0,0,0)
      collider.rotation.set(0,0,0)
      collider.scale.set(1,1,1)
      jobj.setCollider('mesh',{mesh: collider})
      jobj.colliders.parent = object
      return jobj
    }

  })
});
