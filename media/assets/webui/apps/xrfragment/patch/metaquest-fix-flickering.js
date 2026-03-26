// Meta Quest 2 results in rapid flickering when loading a new room
// therefore we show the shroud while loading
setActiveRoom = room.janus.setActiveRoom.bind(room.janus)
room.janus.setActiveRoom = function(url,referer,skipURL){
  if( url.replace(/#.*/,'') != room.url ){
    room.fadeAudioOut()
    room.skybox  = false
    setTimeout( function(){ 
      setActiveRoom.apply(room.janus, [url, referer, skipURL])
    }, 1000)
  } // ignore same-room calls (it restarts audio when clicking internal hyperlinks)
}
