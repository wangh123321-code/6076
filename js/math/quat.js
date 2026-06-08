export const quat = {
    create: function(x = 0, y = 0, z = 0, w = 1) {
        return new Float32Array([x, y, z, w]);
    },

    clone: function(a) {
        return new Float32Array(a);
    },

    copy: function(out, a) {
        out[0] = a[0];
        out[1] = a[1];
        out[2] = a[2];
        out[3] = a[3];
        return out;
    },

    set: function(out, x, y, z, w) {
        out[0] = x;
        out[1] = y;
        out[2] = z;
        out[3] = w;
        return out;
    },

    identity: function(out) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
    },

    multiply: function(out, a, b) {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = b[0], by = b[1], bz = b[2], bw = b[3];

        out[0] = ax * bw + aw * bx + ay * bz - az * by;
        out[1] = ay * bw + aw * by + az * bx - ax * bz;
        out[2] = az * bw + aw * bz + ax * by - ay * bx;
        out[3] = aw * bw - ax * bx - ay * by - az * bz;

        return out;
    },

    rotateX: function(out, a, rad) {
        rad *= 0.5;
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bx = Math.sin(rad), bw = Math.cos(rad);

        out[0] = ax * bw + aw * bx;
        out[1] = ay * bw + az * bx;
        out[2] = az * bw - ay * bx;
        out[3] = aw * bw - ax * bx;

        return out;
    },

    rotateY: function(out, a, rad) {
        rad *= 0.5;
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const by = Math.sin(rad), bw = Math.cos(rad);

        out[0] = ax * bw - az * by;
        out[1] = ay * bw + aw * by;
        out[2] = az * bw + ax * by;
        out[3] = aw * bw - ay * by;

        return out;
    },

    rotateZ: function(out, a, rad) {
        rad *= 0.5;
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        const bz = Math.sin(rad), bw = Math.cos(rad);

        out[0] = ax * bw + ay * bz;
        out[1] = ay * bw - ax * bz;
        out[2] = az * bw + aw * bz;
        out[3] = aw * bw - az * bz;

        return out;
    },

    fromEuler: function(out, x, y, z) {
        const halfToRad = 0.5;
        x *= halfToRad;
        y *= halfToRad;
        z *= halfToRad;

        const sx = Math.sin(x);
        const cx = Math.cos(x);
        const sy = Math.sin(y);
        const cy = Math.cos(y);
        const sz = Math.sin(z);
        const cz = Math.cos(z);

        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;

        return out;
    },

    fromAxisAngle: function(out, axis, rad) {
        rad *= 0.5;
        const s = Math.sin(rad);
        out[0] = axis[0] * s;
        out[1] = axis[1] * s;
        out[2] = axis[2] * s;
        out[3] = Math.cos(rad);
        return out;
    },

    normalize: function(out, a) {
        const x = a[0], y = a[1], z = a[2], w = a[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            out[0] = a[0] * len;
            out[1] = a[1] * len;
            out[2] = a[2] * len;
            out[3] = a[3] * len;
        }
        return out;
    },

    length: function(a) {
        const x = a[0], y = a[1], z = a[2], w = a[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    },

    inverse: function(out, a) {
        const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
        const dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
        const invDot = dot ? 1.0 / dot : 0;

        out[0] = -a0 * invDot;
        out[1] = -a1 * invDot;
        out[2] = -a2 * invDot;
        out[3] = a3 * invDot;

        return out;
    },

    slerp: function(out, a, b, t) {
        if (t === 0) {
            out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
            return out;
        }
        if (t === 1) {
            out[0] = b[0]; out[1] = b[1]; out[2] = b[2]; out[3] = b[3];
            return out;
        }

        let ax = a[0], ay = a[1], az = a[2], aw = a[3];
        let bx = b[0], by = b[1], bz = b[2], bw = b[3];

        let cosHalfTheta = aw * bw + ax * bx + ay * by + az * bz;

        if (cosHalfTheta < 0) {
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
            cosHalfTheta = -cosHalfTheta;
        }

        if (Math.abs(cosHalfTheta) >= 1.0) {
            out[0] = ax; out[1] = ay; out[2] = az; out[3] = aw;
            return out;
        }

        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            out[0] = (ax * 0.5 + bx * 0.5);
            out[1] = (ay * 0.5 + by * 0.5);
            out[2] = (az * 0.5 + bz * 0.5);
            out[3] = (aw * 0.5 + bw * 0.5);
            return out;
        }

        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        out[0] = (ax * ratioA + bx * ratioB);
        out[1] = (ay * ratioA + by * ratioB);
        out[2] = (az * ratioA + bz * ratioB);
        out[3] = (aw * ratioA + bw * ratioB);

        return out;
    },

    lerp: function(out, a, b, t) {
        const ax = a[0], ay = a[1], az = a[2], aw = a[3];
        out[0] = ax + t * (b[0] - ax);
        out[1] = ay + t * (b[1] - ay);
        out[2] = az + t * (b[2] - az);
        out[3] = aw + t * (b[3] - aw);
        return this.normalize(out, out);
    },

    toEuler: function(out, q, order = 'ZXY') {
        const x = q[0], y = q[1], z = q[2], w = q[3];
        const orderUpper = order.toUpperCase();

        if (orderUpper === 'ZXY') {
            const sinY = 2 * (w * y - x * z);
            if (Math.abs(sinY) >= 1 - 1e-6) {
                out[0] = 2 * Math.atan2(x, w);
                out[1] = Math.PI / 2 * Math.sign(sinY);
                out[2] = 0;
            } else {
                out[0] = Math.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y));
                out[1] = Math.asin(Math.max(-1, Math.min(1, sinY)));
                out[2] = Math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z));
            }
        } else if (orderUpper === 'XYZ') {
            const sinY = 2 * (w * y + x * z);
            if (Math.abs(sinY) >= 1 - 1e-6) {
                out[0] = 2 * Math.atan2(x, w);
                out[1] = Math.PI / 2 * Math.sign(sinY);
                out[2] = 0;
            } else {
                out[0] = Math.atan2(2 * (w * x - y * z), 1 - 2 * (x * x + y * y));
                out[1] = Math.asin(Math.max(-1, Math.min(1, sinY)));
                out[2] = Math.atan2(2 * (w * z - x * y), 1 - 2 * (y * y + z * z));
            }
        } else if (orderUpper === 'YXZ') {
            const sinX = 2 * (w * x - y * z);
            if (Math.abs(sinX) >= 1 - 1e-6) {
                out[0] = Math.PI / 2 * Math.sign(sinX);
                out[1] = 2 * Math.atan2(y, w);
                out[2] = 0;
            } else {
                out[0] = Math.asin(Math.max(-1, Math.min(1, sinX)));
                out[1] = Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y));
                out[2] = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z));
            }
        } else if (orderUpper === 'ZYX') {
            const sinY = -2 * (w * y + x * z);
            if (Math.abs(sinY) >= 1 - 1e-6) {
                out[0] = 2 * Math.atan2(x, w);
                out[1] = -Math.PI / 2 * Math.sign(sinY);
                out[2] = 0;
            } else {
                out[0] = Math.atan2(2 * (y * z - w * x), 1 - 2 * (x * x + y * y));
                out[1] = Math.asin(Math.max(-1, Math.min(1, sinY)));
                out[2] = Math.atan2(2 * (x * y - w * z), 1 - 2 * (y * y + z * z));
            }
        } else {
            throw new Error(`Unsupported rotation order: ${order}`);
        }

        return out;
    },

    fromEulerWithOrder: function(out, x, y, z, order = 'ZXY') {
        const orderUpper = order.toUpperCase();
        this.identity(out);

        if (orderUpper === 'ZXY') {
            this.rotateZ(out, out, z);
            this.rotateX(out, out, x);
            this.rotateY(out, out, y);
        } else if (orderUpper === 'XYZ') {
            this.rotateX(out, out, x);
            this.rotateY(out, out, y);
            this.rotateZ(out, out, z);
        } else if (orderUpper === 'YXZ') {
            this.rotateY(out, out, y);
            this.rotateX(out, out, x);
            this.rotateZ(out, out, z);
        } else if (orderUpper === 'ZYX') {
            this.rotateZ(out, out, z);
            this.rotateY(out, out, y);
            this.rotateX(out, out, x);
        } else {
            throw new Error(`Unsupported rotation order: ${order}`);
        }

        return out;
    },

    fromMat4: function(out, m) {
        const m00 = m[0], m01 = m[1], m02 = m[2];
        const m10 = m[4], m11 = m[5], m12 = m[6];
        const m20 = m[8], m21 = m[9], m22 = m[10];

        const trace = m00 + m11 + m22;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            out[3] = 0.25 / s;
            out[0] = (m21 - m12) * s;
            out[1] = (m02 - m20) * s;
            out[2] = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            out[3] = (m21 - m12) / s;
            out[0] = 0.25 * s;
            out[1] = (m01 + m10) / s;
            out[2] = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            out[3] = (m02 - m20) / s;
            out[0] = (m01 + m10) / s;
            out[1] = 0.25 * s;
            out[2] = (m12 + m21) / s;
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            out[3] = (m10 - m01) / s;
            out[0] = (m02 + m20) / s;
            out[1] = (m12 + m21) / s;
            out[2] = 0.25 * s;
        }

        return this.normalize(out, out);
    }
};
