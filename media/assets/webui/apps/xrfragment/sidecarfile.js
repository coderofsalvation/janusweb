/* XR URI Fragments spec (https://xrfragment.org)
 *
 * level0 sidecar files as per the XR URI Fragments spec
 * https://xrfragment.org/#sidecar%20files
 * 
 */

elation.require([], function() {

  elation.extend('janusweb.sidecarfile', class {
    constructor(object) {
      this.scene     = elation.engine.instances.default.systems.world.scene['world-3d'] 
      this._object   = object
      this.extension = /\.(gltf|glb|dae)$/
      if( room.url.match(this.extension) ){
        this.load()
      }
    }

    load(){
      const audio = room.url.replace(this.extension,'.ogg') 
      room.assetlist.push({assettype:'audio', id:"xrf_audio", src:audio})
      // todo load asset (if not already loaded by -janus-asset: image -janus-asset-src: kshdkjsf.wav)
      //this.locdRoomAssets({assets:{ room.assetlist }})
      //debugger
    }


  })
});

xrf_install_sidecarfiles = function(){
 if( !room.sidecarfile ){ 
   room.sidecarfile = new elation.janusweb.sidecarfile(room);
 }
}

elation.events.add(null, 'room_load_complete', xrf_install_sidecarfiles )
xrf_install_sidecarfiles()
