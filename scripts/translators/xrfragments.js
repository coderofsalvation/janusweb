elation.require([], function() {
  elation.component.add('janusweb.translators.xrfragments', function() {
    this.init = function() {
      this.description = "this implements the https://xrfragment.org standard for immersive 3d file browsing"
    }
    this.exec = function(args) {
      return new Promise(elation.bind(this, function(resolve, reject) {

        var room = this.room = args.room;
        elation.events.add(room._room, 'room_load_complete', this.spawnUser.bind(this) )

        var datapath = elation.config.get('janusweb.datapath', '/media/janusweb');

        var roomdata = {
          assets: {
            assetlist: [
              {assettype: 'model', name: 'scene', src: args.url},
            ]
          },
          room: {
            pos: [0,0,0],
            xdir: "1 0 0",
            zdir: "0 0 1",
          },
          object: [
            {id: 'scene', js_id: 0, pos: "0 0 0", xdir: "-1 0 0", zdir: "0 0 -1", lighting: "false"}
          ],
          link: []
        };
        resolve(roomdata);
      }));
    }

    this.spawnUser = function(source) {
      // XR Fragments deeplink spec: explicit or default spawn
      // https://xrfragment.org/#teleport%20camera
      if( ! this.room.urlhash ) this.room.urlhash = 'spawn'
      this.room.setPlayerPosition.apply(this.room)
      console.log("[xrfragment] camera teleport")
    }

    // translate XR Fragments microformat into JML
    this.parseSource = function(sourcecode, room){
      this.room = room
      elation.events.add(room._room, 'room_load_complete', this.spawnUser.bind(this) )

      // extract src value
      let el = document.createElement("div")
      el.innerHTML = sourcecode
      let link = el.querySelector("link[as=spatial-entrypoint]")
      let title = el.querySelector("title")
      let href = link.getAttribute("href")
      if( !href ) return
      // override microformat xr fragment
      if( href.match(/#/) ) room.urlhash = href.replace(/.*#/,'')

      // return JML
      let jml = `
      <title>${ title ? title.innerText.replace(/\n.*/g,'') : baseurl.split("/").pop() }</title>
      <FireBoxRoom>
          <Assets>
            <assetobject id="scene" src="${href}"/>
          </Assets>
          <Room>
            <object pos="0 0 0" collision_id="scene" id="scene" />
          </Room>
       </FireBoxRoom>`
        console.log(jml)
      let source = room.parseSource(jml)

 //     setTimeout( this.spawnUser, 1000 ) // *FIXME* trigger after load scene
      return source
    }
    // microformat heuristic (https://xrfragment.org/#XRF%20microformat)
    // example: <link rel="alternate" as="spatial-entrypoint" src="https://foo.org/bar.glb"> 
    this.parseSource.regex = /<link\s+[^>]*rel=['"]spatial-entrypoint['"][^>]*\/?>/si;

  });
});

