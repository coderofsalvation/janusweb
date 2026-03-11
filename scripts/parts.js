elation.require([], function() {

  elation.extend('janusweb.parts', class {
    constructor(object) {
      this._object = object;
      this._parts = {};
      this._proxies = {};
      //this.updateParts();
    }
    definePart(name, part) {
      Object.defineProperty(this, name, {
        get: () => this.getPartByName(name),
        enumerable: true,
        configurable: true
      });
    }
    updateParts() {
      this._object.extractEntities();
      var obj = this._object._target || this._object;
      var parts = obj.parts;
      for (var k in parts) {
        this.definePart(k, parts[k]);
      }
    }
    getPartForObject(object) {
      let name = object.name || object.uuid;
      if (!this._proxies[name]) {
        var rootobject = this._object._target || this._object;
        let newpart = this._parts[name] = this._object.createObject("object",{
          js_id: name
        })
        newpart.add(object)

        // TODO - set up object hierarchy here
        this._proxies[name] = newpart
        this._proxies[name].start();
      }
      return this._proxies[name];
    }
    getPartByName(name) {
      if (!this._proxies[name]) {
        var obj = this._object._target || this._object;
        var part = obj.parts[name];
        if (part) {
          return this.getPartForObject(part);
        }
      }
      return this._proxies[name];
    }
  })
});
