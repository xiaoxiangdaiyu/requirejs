(function(){
    var modules =[];
    var getCurrentPath = function(){
        var reg = /[\&\?]{1}.+/g;
        var curS = '';
        if(document.currentScript){
            curS = document.currentScript.src;
        }else{
            /**
             * 同上，不支持document.currentScript
             * 兼容处理
             * */
            var node = getCurrentNode();
            curS = document.querySelector ? node.src : node.getAttribute("src", 4);
        }
        return curS.replace(reg,'');
    };
    var getCurrentNode = function(){
        if(document.currentScript) return document.currentScript;
        /**
         * 兼容性处理
         * */
        var arrScript = document.getElementsByTagName("script");
        var len = arrScript.length;
        for(var i= 0; i<len; i++) {
            if(arrScript[i].readyState === "interactive") {
                return arrScript[i];
            };
        };

        //IE11的特殊处理;
        var path = getCurrentPath();
        for(var i= 0; i<len; i++) {
            if(path.indexOf(arrScript[i].src)!==-1) {
                return arrScript[i];
            }
        }
        throw new Error("getCurrentNode error");
    };
    /**
     *
     * */
    var loadDp = function(module) {
        for(var p =0; p<module.dps.length; p++) {
            /**
             * get file path
             * */
            var dp = getUrl(module.dps[p]);
            /**
             * 若当前队列中不存在则加载该模块
             * */
             !modules[dp] && loadScript(dp);
        }
    };
    var checkDps=function(){
        /**
         * 查看模块加载进度。
         * */
        for(var key in modules ) {
            var params = [];
            var module = modules[key];
            /**
             * 根据state做不同处理
             * */
            if( module.state === "complete" ) {
                continue;
            }
            if( module.state === "init" ) {
                loadDp(module);
                module.state = "loading";
            }
            if( module.state === "loading") {
                for(var p =0; p<module.dps.length; p++) {
                    var dp = getUrl(module.dps[p]);
                   /**
                    * 如果依赖加载完成了， 而且状态为complete;
                    * */
                    if( modules[dp] && modules[dp].state === "complete") {
                        params.push( modules[dp].exports );
                    }
                }
                /**
                 * 全部加载完成，执行
                 * */
                if( module.dps.length === params.length ) {
                    if(typeof module.exports === "function"){
                        module.exports = module.exports.apply(modules,params);
                        module.state = "complete";
                        /**
                         * 当某个模块加载完毕就重新检测依赖modules，
                         * 看看是否有未加载完毕的模块需要加载;
                         * */
                        checkDps();
                    }
                }
            }
        }
    };
    /**
     * 获取file完整url
     * */
    var getUrl=function(src){
        /**
         * 根据字符串格式判断如何处理
         * */
        var scriptSrc = '';
        try{
            if(src.match(/^\/|^\.\//)){
                /**
                 * 以/或者./开头
                 * */
                scriptSrc = require.config .basePath + src.replace(/(^\/|^\.\/)/,"");
            }else if(src.match(/^http:|^file:/)){
                /**
                 * 直接完整路径不需要处理
                 * */
                scriptSrc = src;
            }else if( src.match(/^[a-zA-Z1-9]/) ){
                scriptSrc = require.config.basePath + src;
            }else{
                throw new Error('文件路径不匹配');
            }
        }catch(e){
            console.dir(e);
            return '';
        }
        scriptSrc.lastIndexOf(".js") === -1 &&(scriptSrc += ".js");
        return scriptSrc;
    };
    var loadScript=function(src){
        var scriptUrl = getUrl(src);
        var node = document.createElement('script'),
            head = document.querySelector('head');
        node.src = scriptUrl;
        node.onload = function(){
            console.log('module src is >>>>>'+src+'<<<<<<正在加载');
        };
        head.appendChild(node);
    };
    var getBasePath=function(){
        /**
         * 此处指定入口文件应该在文件根目录，逻辑文件最多与其同级。
         * */
        var src = getCurrentPath();
        var index = src.lastIndexOf("/");
        return  src.substring(0,index+1);
    };
    var define=function(dps,fuc,name){
        /**
         * 无依赖的模块，无依赖数组。
         * 则第一个参数为fuc，否则的话不符合规范
         * */
        if(typeof dps === 'function'){
            fuc = dps;
            dps = [];
        }
        if(typeof dps !== 'object' || typeof fuc !== 'function'){
            console.log('请按规范使用');
        }
        var src = getCurrentPath();
        if(dps.length == 0){
        /**
         * 没有依赖，即可以直接返回fuc执行结果，状态为complete
         * */
         modules[src] = {
             name: name || src,
             src: src,
             dps: [],
             exports:(typeof fuc === "function")&&fuc(),
             state: 'complete'
         }
        }else{
          /**
           * 有依赖，需要加载依赖直到完成。
           * */
          modules[src] = {
              name:name || src,
              src: src,
              dps: dps,
              exports: fuc,
              state: 'init'
          }
        }
        /**
         * 继续查看依赖
         * */
        return checkDps();
    };
    window.define = define;
    window.require = function(){
        /**
         * 取巧，就不去实现require的方法了。
         * 此时的require无非是依赖模块，然后实现方法。
         * 将参数整合一下传入，name即指定参数避免冲突
         * */
        window.define.apply([], Array.prototype.slice.call(arguments).concat( "module|"+setTimeout(function() {},0) ));
    };
    /**
     * 获取当前的基本路径
     * */
    require.config = {
        basePath : getBasePath()
    };
    var loadDefaultJS = getCurrentNode().getAttribute("data-main");
    loadDefaultJS && loadScript(loadDefaultJS);
})();
