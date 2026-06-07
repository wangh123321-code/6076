export const Shaders = {
    vertexColor: {
        vert: `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            
            varying vec4 vColor;
            
            void main() {
                vColor = aColor;
                gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;
            
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `
    },

    vertexUniformColor: {
        vert: `
            attribute vec3 aPosition;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            
            void main() {
                gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;
            
            uniform vec4 uColor;
            
            void main() {
                gl_FragColor = uColor;
            }
        `
    },

    vertexPoint: {
        vert: `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            attribute float aSize;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            
            varying vec4 vColor;
            
            void main() {
                vColor = aColor;
                vec4 pos = uProjection * uView * uModel * vec4(aPosition, 1.0);
                gl_Position = pos;
                gl_PointSize = aSize / pos.w;
            }
        `,
        frag: `
            precision mediump float;
            
            varying vec4 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
                gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
            }
        `
    },

    vertexLine: {
        vert: `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            
            varying vec4 vColor;
            
            void main() {
                vColor = aColor;
                gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;
            
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `
    },

    sphere: {
        vert: `
            attribute vec3 aPosition;
            attribute vec3 aNormal;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            uniform mat4 uModel;
            uniform vec3 uLightDir;
            uniform vec4 uColor;
            uniform float uAmbient;
            
            varying vec4 vColor;
            
            void main() {
                mat3 normalMatrix = mat3(uModel);
                vec3 normal = normalize(normalMatrix * aNormal);
                float diffuse = max(dot(normal, normalize(uLightDir)), 0.0);
                
                vec3 color = uColor.rgb * (uAmbient + diffuse * (1.0 - uAmbient));
                vColor = vec4(color, uColor.a);
                
                gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;
            
            varying vec4 vColor;
            
            void main() {
                gl_FragColor = vColor;
            }
        `
    },

    grid: {
        vert: `
            attribute vec3 aPosition;
            attribute vec4 aColor;
            
            uniform mat4 uProjection;
            uniform mat4 uView;
            
            varying vec4 vColor;
            varying vec3 vPosition;
            
            void main() {
                vColor = aColor;
                vPosition = aPosition;
                gl_Position = uProjection * uView * vec4(aPosition, 1.0);
            }
        `,
        frag: `
            precision mediump float;
            
            varying vec4 vColor;
            varying vec3 vPosition;
            
            void main() {
                float dist = length(vPosition.xz);
                float fade = 1.0 - smoothstep(40.0, 60.0, dist);
                vec4 color = vColor;
                color.a *= fade;
                gl_FragColor = color;
            }
        `
    }
};

export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return program;
}

export function createProgramFromSources(gl, shaderSources) {
    return createProgram(gl, shaderSources.vert, shaderSources.frag);
}
