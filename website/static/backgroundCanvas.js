function loadShader(gl, source, type) {
    var precision = "precision highp float;\n";
    // check if precision highp float is supported
    // if not, fallback to precision mediump float
    if (gl.getShaderPrecisionFormat(type, gl.HIGH_FLOAT) == null) {
        precision = "precision mediump float;\n"
    }
    const shader = gl.createShader(type);
    gl.shaderSource(shader, precision+source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("Failed to compile shader: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function linkShaderProgram(gl, shaders) {
    const shaderProgram = gl.createProgram();
    console.log(shaders);
    for (i in shaders) {
        console.log(i);
        gl.attachShader(shaderProgram, shaders[i]);
    }
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log("Failed to link shader program: " + gl.getProgramInfoLog(shaderProgram));
        gl.deleteProgram(shaderProgram);
        return null;
    }
    return shaderProgram;
}

function AudioSpectrumVisualization(gl, width, height, textureScale, fftSize, audioElement) {
    var that = this;
    this.width = width;
    this.height = height;
    this.textureScale = textureScale;
    this.gl = gl;
    var vertexShader = loadShader(gl, audioSpectrumVisualizationVertexShaderSource, gl.VERTEX_SHADER);
    var fragmentShader = loadShader(gl, audioSpectrumVisualizationFragmentShaderSource, gl.FRAGMENT_SHADER);
    this.shaderProgram = linkShaderProgram(gl, [vertexShader, fragmentShader]);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    this.shaderAttributes = {
        vPos: gl.getAttribLocation(this.shaderProgram, "vPos"),
    };
    this.shaderUniforms = {
        pointSize: gl.getUniformLocation(this.shaderProgram, "pointSize"),
        res: gl.getUniformLocation(this.shaderProgram, "res"),
    };
  
    var initialTex = new Uint8Array(this.width*this.height*4);
    initialTex.fill(0);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.framebuffer = gl.createFramebuffer();
 
    this.setTextureSize = function(width, height, textureScale) {
        var initialTex = new Uint8Array(width*height*4);
        initialTex.fill(0);
        that.width = width*textureScale;
        that.height = height*textureScale;
        that.textureScale = textureScale;
        gl.bindTexture(gl.TEXTURE_2D, that.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, that.width, that.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, that.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, that.texture, 0);
    }
    this.setTextureSize(width, height, textureScale);
    this.updateTextureSizeOnNextFrame = false;
    this.setTextureSizeOnNextFrame = function(width, height, textureScale) {
        that.updateTextureSizeOnNextFrame = true;
        that.newTextureWidth = width;
        that.newTextureHeight = height;
        that.newTextureScale = textureScale
    };
    
    this.supported = true;
    if ((window.AudioContext || window.webkitAudioContext) === undefined) {
        this.supported = false;
        this.render = function(timestamp) {
        };
        return;
    }
    
    this.audioElement = audioElement;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioAnalyzer = this.audioContext.createAnalyser();
    this.audioAnalyzer.fftSize = fftSize;
    this.spectrum = new Float32Array(this.audioAnalyzer.frequencyBinCount);
//    document.addEventListener("blur", function() { that.audioElement.pause(); }, true);
//    document.addEventListener("focus", function() { that.audioElement.play(); }, true);
    this.audioSrc = this.audioContext.createMediaElementSource(this.audioElement);
    this.audioSrc.connect(this.audioAnalyzer);
    this.audioSrc.connect(this.audioContext.destination);
   
    this.spectrumVerts = new Float32Array(this.spectrum.length*2);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spectrumVerts, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.shaderAttributes.vPos);
    gl.vertexAttribPointer(this.shaderAttributes.vPos,2,gl.FLOAT,false,0,0);
    
    this.updateSpectrum = function() {
        if (that.updateTextureSizeOnNextFrame) {
            that.setTextureSize(that.newWidth, that.newHeight, that.newTextureScale);
            that.updateTextureSizeOnNextFrame = false;
        }
        that.audioAnalyzer.getFloatFrequencyData(that.spectrum);
        for (var i=0; i < that.spectrum.length; i++) {
            that.spectrumVerts[i*2] = 2.0*i/that.spectrum.length - 1.0;
            var a = that.spectrum[i]/192.0;
            that.spectrumVerts[i*2+1] = a;
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, that.spectrumVerts);
    };

    this.render = function(timestamp) {
        gl.bindBuffer(gl.ARRAY_BUFFER, that.vertexBuffer);
        gl.vertexAttribPointer(this.shaderAttributes.vPos,2,gl.FLOAT,false,0,0);
        that.updateSpectrum();
        gl.bindFramebuffer(gl.FRAMEBUFFER, that.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(that.shaderProgram);
        gl.uniform2f(that.shaderUniforms.res, that.width, that.height);
        gl.uniform1f(that.shaderUniforms.pointSize, 8.0*that.textureScale);
        gl.drawArrays(gl.POINTS, 0, that.spectrum.length);
//        gl.finish();
    }
}



function WebGLBackground(canvas) {
    var that = this;

    this.canvas = canvas;
    this.gl = canvas.getContext("webgl");
    var gl = this.gl;
    if (!gl) {
        console.log("failed to init webgl context.");
        //TODO fallback background here
        return;
    }
    console.log("Initialized webgl context.");
    
    this.width = canvas.width;
    this.height = canvas.height;
    this.textureScale = 1.0;
    this.audioVisualization = new AudioSpectrumVisualization(gl, this.width, this.height, this.textureScale, 1024, document.getElementById("backgroundAudio"));

    var vertexShader = loadShader(gl, webGLBackgroundVertexShaderSource, gl.VERTEX_SHADER);
    var fragmentShader = loadShader(gl, webGLBackgroundFragmentShaderSource, gl.FRAGMENT_SHADER);
    var fragmentShaderForce = loadShader(gl, webGLBackgroundFragmentShaderForceSource, gl.FRAGMENT_SHADER);
    var shaderProgram = linkShaderProgram(gl, [vertexShader, fragmentShader]);
    var shaderForceProgram = linkShaderProgram(gl, [vertexShader, fragmentShaderForce]);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(fragmentShaderForce);

    document.getElementById("background-image").classList.add("webGLBackground");
    this.shaderProgram = shaderProgram;
    this.shaderForceProgram = shaderForceProgram;
    this.shaderAttributes = {
            vPos: gl.getAttribLocation(shaderProgram, "vPos"),
    };
    this.shaderUniforms = {
        res: gl.getUniformLocation(shaderProgram, "res"),
        pointer: gl.getUniformLocation(shaderProgram, "pointer"),
        pointerDeltaCumulative: gl.getUniformLocation(shaderProgram, "pointerDeltaCumulative"),
        backbuffer: gl.getUniformLocation(shaderProgram, "backbuffer"),
        force: gl.getUniformLocation(shaderProgram, "force"),
        initial: gl.getUniformLocation(shaderProgram, "initial"),
        time: gl.getUniformLocation(shaderProgram, "time"),
        waveform: gl.getUniformLocation(shaderProgram, "waveform"),
    };
    this.shaderForceAttributes = {
        vPos: gl.getAttribLocation(shaderForceProgram, "vPos"),
    };
    this.shaderForceUniforms = {
        res: gl.getUniformLocation(shaderForceProgram, "res"),
        pointer: gl.getUniformLocation(shaderForceProgram, "pointer"),
        pointerDeltaCumulative: gl.getUniformLocation(shaderForceProgram, "pointerDeltaCumulative"),
        forceBackbuffer: gl.getUniformLocation(shaderForceProgram, "forceBackbuffer"),
        time: gl.getUniformLocation(shaderForceProgram, "time"),
        waveform: gl.getUniformLocation(shaderForceProgram, "waveform"),
    };

    const verts = [
        -1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ];

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(this.shaderAttributes.vPos);
    gl.vertexAttribPointer(this.shaderAttributes.vPos,2,gl.FLOAT,false,0,0);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    this.pointer = {x: 0, y: 0};
    this.pointerDeltaCumulative = {x: 0, y: 0};

    window.addEventListener('mousemove',function(evt) {
        var dx = evt.clientX*that.textureScale - that.pointer.x;
        var dy = evt.clientY*that.textureScale - that.pointer.y;
        that.pointerDeltaCumulative.x += dx;
        that.pointerDeltaCumulative.y += dy;
        that.pointer.x = evt.clientX * that.textureScale;
        that.pointer.y = evt.clientY * that.textureScale;
    });

    var initialTex = new Uint8Array(this.width*this.height*4);
    initialTex.fill(0);
    

    this.backbufferTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.backbufferTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialTex);

    initialTex.fill(0);
    this.forceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.forceTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialTex);


    this.forceFramebufferTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.forceFramebufferTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialTex);


    this.forceFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.forceFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.forceFramebufferTexture, 0);
    this.updateForceTextureSizeNextRender = false;
    this.updateBackbufferTextureSizeNextRender = false;
    this.setTextureSize = function(width, height, textureScale) {
        that.width = width*textureScale;
        that.height = height*textureScale;
        that.textureScale = textureScale;
        var initialTex = new Uint8Array(width*height*4);
        initialTex.fill(0);
        gl.bindTexture(gl.TEXTURE_2D, that.forceFramebufferTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialTex);
        gl.bindFramebuffer(gl.FRAMEBUFFER, that.forceFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, that.forceFramebufferTexture, 0);
        that.audioVisualization.setTextureSize(width, height, textureScale);
        that.updateForceTextureSizeNextRender = true;
        that.updateBackbufferTextureSizeNextRender = true;
        that.canvas.width = that.width;
        that.canvas.height = that.height;
        gl.viewport(0, 0, that.width, that.height);
    };

    this.updateSizeOnNextFrame = false;
    this.setSizeOnNextFrame = function(width, height, textureScale) {
        that.updateSizeOnNextFrame = true;
        that.newWidth = width;
        that.newHeight = height;
        that.newTextureScale = textureScale;
    };

    this.renderForceTexture = function(timestamp) {
        gl.bindBuffer(gl.ARRAY_BUFFER, that.vertexBuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, that.forceFramebuffer);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(that.shaderForceProgram);

        gl.uniform2f(that.shaderForceUniforms.res, that.width, that.height);
        gl.uniform2f(that.shaderForceUniforms.pointer, that.pointer.x, that.pointer.y);
        gl.uniform2f(that.shaderForceUniforms.pointerDeltaCumulative, that.pointerDeltaCumulative.x, that.pointerDeltaCumulative.y);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, that.audioVisualization.texture);
        gl.uniform1i(that.shaderForceUniforms.waveform, 1);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, that.forceTexture);
        gl.uniform1i(that.shaderForceUniforms.forceBackbuffer, 0);

        gl.uniform1f(that.shaderForceUniforms.time, timestamp);
        gl.bindBuffer(gl.ARRAY_BUFFER, that.vertexBuffer);
        gl.vertexAttribPointer(that.shaderForceAttributes.vPos,2,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        //gl.finish();
        if (that.updateForceTextureSizeNextRender) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, that.width, that.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            that.updateForceTextureSizeNextRender = false;
        }
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, that.width, that.height, 0);
      
    };

    this.renderOutput = function(timestamp) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        //gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(that.shaderProgram);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, that.audioVisualization.texture);
        gl.uniform1i(that.shaderUniforms.waveform, 2);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, that.forceTexture);
        gl.uniform1i(that.shaderUniforms.force, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, that.backbufferTexture);
        gl.uniform1i(that.shaderUniforms.backbuffer, 0);
        gl.uniform2f(that.shaderUniforms.res, that.width, that.height);
        gl.uniform2f(that.shaderUniforms.pointer, that.pointer.x, that.pointer.y);
        gl.uniform2f(that.shaderUniforms.pointerDeltaCumulative, that.pointerDeltaCumulative.x, that.pointerDeltaCumulative.y);
        gl.uniform1f(that.shaderUniforms.time, timestamp);

        that.pointerDeltaCumulative = {x: 0, y: 0};
        gl.bindBuffer(gl.ARRAY_BUFFER, that.vertexBuffer);
        gl.vertexAttribPointer(that.shaderAttributes.vPos,2,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        //gl.drawElements(gl.TRIANGLE_STRIP, 4, gl.UNSIGNED_SHORT, that.audioVisualization.spectrum.length*2);
        

//        gl.finish();
        if (that.updateBackbufferTextureSizeNextRender) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, that.width, that.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            that.updateBackbufferTextureSizeNextRender = false;
        }
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, that.width, that.height, 0);
     
    };
    that.msPerAvgFPS = 1000.0;
    that.fpsInitialTime = -1;
    this.nFrames = 0;
    this.renderCallback = function(timestamp) {
        if (that.fpsInitialTime == -1) {
            that.fpsInitialTime = timestamp;
        }
        that.nFrames = that.nFrames + 1;
        var deltaTime = timestamp - that.fpsInitialTime;
        if (deltaTime > that.msPerAvgFPS) {
            var avgFps = 1000.0*that.nFrames / deltaTime;
            that.nFrames = 0;
            that.fpsInitialTime = timestamp
            if (avgFps < 45.0 && that.textureScale > 0.5) {
                that.setSizeOnNextFrame(window.innerWidth, window.innerHeight, that.textureScale - 0.125);
            } else if (avgFps > 58.0 && that.textureScale < 1.0) {
                that.setSizeOnNextFrame(window.innerWidth, window.innerHeight, that.textureScale + 0.125);
            }
        }

        if (that.updateSizeOnNextFrame) {
            that.updateSizeOnNextFrame = false;
            that.setTextureSize(that.newWidth, that.newHeight, that.newTextureScale);
        }
          that.audioVisualization.render(timestamp);
        
          that.renderForceTexture(timestamp);

          that.renderOutput(timestamp);
       
        window.requestAnimationFrame(that.renderCallback);

    }

    window.requestAnimationFrame(this.renderCallback);
    
}

function setupBackgroundToggle() {
    var mvt = document.getElementById("music-visualizer-toggle");
    var bg = document.getElementById("background-image");
    mvt.addEventListener('change', function() {
        if (mvt.checked && !window.webgl_background) {
            bg.style.backgroundColor = "#000";
            bg.style.backgroundImage = "none";
            setupBackground();
        }
    });
}

function setupBackground() {
    var canvas = document.getElementById("backgroundCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.webgl_background = new WebGLBackground(canvas);
    window.addEventListener('resize', function() {
        window.webgl_background.setSizeOnNextFrame(window.innerWidth, window.innerHeight, window.webgl_background.textureScale);
    });
}
