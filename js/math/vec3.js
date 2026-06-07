export const vec3 = {
    create: function(x = 0, y = 0, z = 0) {
        return new Float32Array([x, y, z]);
    },

    clone: function(a) {
        return new Float32Array(a);
    },

    copy: function(out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        return out;
    },

    set: function(out, x, y, z) {
        out[0] = x;
        out[1] = y;
        out[2] = z;
        return out;
    },

    add: function(out, a, b) {
        out[0] = a[0] + b[0];
        out[1] = a[1] + b[1];
        out[2] = a[2] + b[2];
        return out;
    },

    subtract: function(out, a, b) {
        out[0] = a[0] - b[0];
        out[1] = a[1] - b[1];
        out[2] = a[2] - b[2];
        return out;
    },

    multiply: function(out, a, b) {
        out[0] = a[0] * b[0];
        out[1] = a[1] * b[1];
        out[2] = a[2] * b[2];
        return out;
    },

    scale: function(out, a, s) {
        out[0] = a[0] * s;
        out[1] = a[1] * s;
        out[2] = a[2] * s;
        return out;
    },

    dot: function(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },

    cross: function(out, a, b) {
        const ax = a[0], ay = a[1], az = a[2];
        const bx = b[0], by = b[1], bz = b[2];
        out[0] = ay * bz - az * by;
        out[1] = az * bx - ax * bz;
        out[2] = ax * by - ay * bx;
        return out;
    },

    length: function(a) {
        return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    },

    lengthSq: function(a) {
        return a[0] * a[0] + a[1] * a[1] + a[2] * a[2];
    },

    normalize: function(out, a) {
        const len = this.length(a);
        if (len === 0) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
        } else {
            const invLen = 1 / len;
            out[0] = a[0] * invLen;
            out[1] = a[1] * invLen;
            out[2] = a[2] * invLen;
        }
        return out;
    },

    distance: function(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    distanceSq: function(a, b) {
        const dx = a[0] - b[0];
        const dy = a[1] - b[1];
        const dz = a[2] - b[2];
        return dx * dx + dy * dy + dz * dz;
    },

    lerp: function(out, a, b, t) {
        out[0] = a[0] + t * (b[0] - a[0]);
        out[1] = a[1] + t * (b[1] - a[1]);
        out[2] = a[2] + t * (b[2] - a[2]);
        return out;
    },

    transformMat4: function(out, a, m) {
        const x = a[0], y = a[1], z = a[2];
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        const invW = w !== 0 ? 1 / w : 0;
        out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
        out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
        out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
        return out;
    },

    min: function(out, a, b) {
        out[0] = Math.min(a[0], b[0]);
        out[1] = Math.min(a[1], b[1]);
        out[2] = Math.min(a[2], b[2]);
        return out;
    },

    max: function(out, a, b) {
        out[0] = Math.max(a[0], b[0]);
        out[1] = Math.max(a[1], b[1]);
        out[2] = Math.max(a[2], b[2]);
        return out;
    },

    toString: function(a) {
        return `vec3(${a[0].toFixed(4)}, ${a[1].toFixed(4)}, ${a[2].toFixed(4)})`;
    }
};
