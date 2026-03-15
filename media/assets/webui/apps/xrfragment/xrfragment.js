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
