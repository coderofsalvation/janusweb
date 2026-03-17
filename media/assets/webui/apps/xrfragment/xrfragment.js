xrf_lib = {

  toJanusObject(obj,opts){
    opts = opts || {}
    let jo = room.objects[ obj.name] || room.createObject('object',{ js_id: obj.name })
    let pos = new THREE.Vector3()
    if( opts.noreparent ){
      jo.objects['3d'] = obj
    }else{ 
      jo.add(obj)
    }
    return jo
  }
    
}

// update urlbar when user or browser activates href 
elation.events.add(null, 'href', function(e){
  const scene  = elation.engine.instances.default.systems.world.scene['world-3d'] 
  const urlbar = document.querySelector('janus-ui-urlbar ui-input')
  const href   = e?.data?.href
  if( urlbar ){
    urlbar.value = href[0] == '#' ? urlbar.value.replace(/#.*/,'') + href : href
  }else console.warn("xrfragment: cannot find urlbar")
})

if( room.urlhash ){ 
  elation.events.fire({element: this, type: 'href', data: {href: `#${room.urlhash}`}});
}
