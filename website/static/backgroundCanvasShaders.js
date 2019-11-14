const audioSpectrumVisualizationVertexShaderSource = `
    attribute vec2 vPos;
    uniform float pointSize;
    void main() {
        gl_Position = vec4(vPos, 0.0, 1.0);
        gl_PointSize = pointSize;
    }
`;

const audioSpectrumVisualizationFragmentShaderSource = `
    uniform vec2 res;
    float pi = 3.141592653589793238164623383;
    void main() {
        vec2 v = gl_PointCoord*2.0 - vec2(1.0);
        float a = 1.0-pow(dot(v,v),1.0/8.0);
        gl_FragColor = vec4(gl_PointCoord.xy, a, 1.0);
    }
`;



const webGLBackgroundVertexShaderSource = `
    attribute vec2 vPos;
    varying float vDist;
    void main() {
        gl_Position = vec4(vPos, 0.0, 1.0);
        gl_PointSize = 8.0;
    }
`;
const webGLBackgroundFragmentShaderForceSource = `
    uniform vec2 res;
    uniform vec2 pointer;
    uniform vec2 pointerDeltaCumulative;
    uniform sampler2D forceBackbuffer;
    uniform sampler2D waveform;
    uniform float time;
    float B = 0.1540447954166071;
    float C = 0.0959552045833929;
    float B2 = 0.1801139653042357;
    float C2 = 0.0698860346957643;

    float s = 20.0;
    
    float pi = 3.141592653589793238164623383;

    vec3 retrieveForce(vec2 uv) {
        vec4 f = texture2D(forceBackbuffer, uv);
        return 2.0*(f.xyz-vec3(0.5))*f.w;
    }
    vec3 retrieveAdjacentForces() {
        vec3 fc = retrieveForce((gl_FragCoord.xy+vec2(-1.0, -1.0))/res);
        fc = fc + retrieveForce((gl_FragCoord.xy+vec2(-1.0, 1.0))/res);
        fc = fc + retrieveForce((gl_FragCoord.xy+vec2(1.0, -1.0))/res);
        fc = fc + retrieveForce((gl_FragCoord.xy+vec2(1.0, 1.0))/res);
        vec3 fb = retrieveForce((gl_FragCoord.xy+vec2(0.0,-1.0))/res);
        fb = fb + retrieveForce((gl_FragCoord.xy+vec2(0.0,1.0))/res);
        fb = fb + retrieveForce((gl_FragCoord.xy+vec2(-1.0,0.0))/res);
        fb = fb + retrieveForce((gl_FragCoord.xy+vec2(1.0,0.0))/res);
        return fc*C2+fb*B2;
    }

    float retrieveForce2(vec2 uv) {
        vec4 f = texture2D(forceBackbuffer, uv);
        return f.w*2.0-1.0;
    }
    float retrieveAdjacentForces2() {
        float fc = retrieveForce2((gl_FragCoord.xy+vec2(-1.0, -1.0))/res);
        fc = fc + retrieveForce2((gl_FragCoord.xy+vec2(-1.0, 1.0))/res);
        fc = fc + retrieveForce2((gl_FragCoord.xy+vec2(1.0, -1.0))/res);
        fc = fc + retrieveForce2((gl_FragCoord.xy+vec2(1.0, 1.0))/res);
        float fb = retrieveForce2((gl_FragCoord.xy+vec2(0.0,-1.0))/res);
        fb = fb + retrieveForce2((gl_FragCoord.xy+vec2(0.0,1.0))/res);
        fb = fb + retrieveForce2((gl_FragCoord.xy+vec2(-1.0,0.0))/res);
        fb = fb + retrieveForce2((gl_FragCoord.xy+vec2(1.0,0.0))/res);
        return fc+fb;
    }

    vec3 fv(vec2 p) {
        vec2 uv = gl_FragCoord.xy/res;
        vec2 d = vec2((uv.x-p.x)*res.x/res.y, uv.y-p.y);
        float d0 = 10.0*sqrt(dot(d,d));
        float d1 = min(max((1.0-1.0*d0),0.0),1.0);
        float d2 = sin(d1*2.0*pi);
        return vec3((d2-1.0)*d/sqrt(dot(d,d)), d2);
    }
    
    void main() {
        vec2 uv0 = gl_FragCoord.xy;
        vec2 uv = uv0/res;
        vec2 p = vec2(pointer.x, res.y - pointer.y)/res;
        vec2 pDelta = vec2(pointerDeltaCumulative.x, -pointerDeltaCumulative.y)/res;
        

        vec3 v0 = vec3(0.0);
        if (dot(pDelta, pDelta) > 0.0) {
            v0 = fv(p);
        }
        
        
        vec3 v1 = vec3(0.0);
        float k = 3.0/4.0;
        float t = time*0.0002;
        for (int i=0; i < 5; i++) {
            float t2 = t + float(i)*8.0/5.0*pi;
            vec2 p1 = vec2(0.5)*((0.9*cos(k*t2)*vec2(res.x/res.y*cos(t2),sin(t2)))+vec2(res.x/res.y,1.0));
            v1 += fv(p1);
        }
        
        vec3 f = retrieveAdjacentForces();
        vec3 prevForce = retrieveForce(gl_FragCoord.xy/res);
        vec3 f2 = prevForce + retrieveForce((gl_FragCoord.xy+prevForce.xy)/res);

        vec3 vw = 2.0*(texture2D(waveform,gl_FragCoord.xy/res).xyz)-vec3(1.0);
        vec3 v = f+2.0/127.0*(v0+vw);
        float vm = sqrt(dot(v.xy,v.xy));
        
        gl_FragColor = vec4(0.5*(v/vm)+vec3(0.5), vm);
    }
`;

const webGLBackgroundFragmentShaderSource = `
    varying float vDist;
    uniform vec2 res;
    uniform vec2 pointer;
    uniform vec2 pointerDeltaCumulative;
    uniform sampler2D backbuffer;
    uniform sampler2D force;
    uniform sampler2D waveform;
    uniform bool initial;
    uniform float time;
    vec2 retrieveForce(vec2 uv) {
        vec4 f = texture2D(force, uv);
        return 2.0*(f.xy - vec2(0.5))*f.z;
    }

    float fa(vec2 p) {
        vec2 uv2 = (gl_FragCoord.xy - p)/res.y;
        return 0.001/sqrt(dot(uv2,uv2));
    }
    float pi = 3.141592653589793238164623383;
    void main() {
        vec2 uv0 = gl_FragCoord.xy;
        vec2 uv1 = uv0 / res;
        vec2 p = vec2(pointer.x, res.y - pointer.y);
        vec2 pDelta = vec2(pointerDeltaCumulative.x, -pointerDeltaCumulative.y);

        float m = sqrt(dot(pDelta,pDelta))/128.0;
        float a = 0.0;
        vec2 uv2 = (uv0-p)/res.y;
        if (dot(pDelta,pDelta) > 0.0) {
            a += 0.00175/sqrt(dot(uv2,uv2));
        }
        float k = 3.0/4.0;
        float t = time*0.0002;
        float a1 = 0.0;
        for (int i=0; i < 5; i++) {
            float t2 = t + float(i)*8.0/5.0*pi;
            vec2 p1 = vec2(0.5)*((0.9*cos(k*t2)*vec2(res.x/res.y*cos(t2),sin(t2)))+vec2(res.x/res.y,1.0));
            float aspectRatio = res.x/res.y;
            vec2 uv3 = uv0/res.y - p1;
            a1 += 0.001/sqrt(dot(uv3,uv3));
        }
        a += a1;
        a += texture2D(waveform, uv1).z;
        vec4 c = vec4(uv1, 1.0-0.5*(uv1.x+uv1.y), 1.0);
        c = c/sqrt(dot(c,c));


        vec3 fbx0 = texture2D(backbuffer, (uv0-vec2(1.0,0.0))/res).rgb;
        vec3 fbx1 = texture2D(backbuffer, (uv0+vec2(1.0,0.0))/res).rgb;
        vec3 fby0 = texture2D(backbuffer, (uv0-vec2(0.0,1.0))/res).rgb;
        vec3 fby1 = texture2D(backbuffer, (uv0+vec2(0.0,1.0))/res).rgb;
        vec4 fb = texture2D(backbuffer, uv0/res);
        float d = dot(fb,fb);
        float dx0 = dot(fbx0,fbx0);
        float dx1 = dot(fbx1,fbx1);
        float dy0 = dot(fby0,fby0);
        float dy1 = dot(fby1,fby1);
        vec2 dxy = vec2(dx1-dx0, dy1-dy0);
        dxy = dxy/dot(dxy,dxy);
        dxy *= 0.05/min(res.x,res.y);
        //vec4 fb_offset = texture2D(backbuffer, uv1+dxy);
        vec4 f = texture2D(force, uv0/res);
        vec2 f2 = 2.0*(f.xy-vec2(0.5))*f.z;
        vec4 fb_offset = texture2D(backbuffer, (uv0+f2)/res);
        vec4 feedback = 0.99*fb_offset;

        
        vec4 fv = texture2D(force,uv1);
        vec3 fv3 = fv.xyz*fv.w;
        vec2 fv2 = fv.w*(fv.xy * 2.0 - vec2(1.0));
        
        //gl_FragColor = vec4(fv.xy,0.0,1.0);
        //gl_FragColor = texture2D(waveform, uv1);
        gl_FragColor = a*c+0.95*texture2D(backbuffer,(uv0+4.0*(fv.xy-vec2(0.2)))/res);//vec4(fv3, 1.0);//vec4(2.0*(fv.xyz-vec3(0.5))*fv.w, 1.0);

    }
`;
