import { vec3 } from './vec3.js';
import { quat } from './quat.js';
import { mat4 } from './mat4.js';

export const CoordinateSystem = {
    UP_AXIS: {
        Y_UP: 'y-up',
        Z_UP: 'z-up'
    },

    UNIT: {
        METERS: 'meters',
        CENTIMETERS: 'centimeters',
        MILLIMETERS: 'millimeters'
    },

    getUnitScale: function(fromUnit, toUnit) {
        const scaleMap = {
            'meters': 1,
            'centimeters': 0.01,
            'millimeters': 0.001
        };
        return scaleMap[fromUnit] / scaleMap[toUnit];
    },

    convertPosition: function(out, pos, fromUp, toUp, scale = 1) {
        const x = pos[0], y = pos[1], z = pos[2];

        if (fromUp === 'y-up' && toUp === 'z-up') {
            out[0] = x * scale;
            out[1] = z * scale;
            out[2] = -y * scale;
        } else if (fromUp === 'z-up' && toUp === 'y-up') {
            out[0] = x * scale;
            out[1] = -z * scale;
            out[2] = y * scale;
        } else {
            out[0] = x * scale;
            out[1] = y * scale;
            out[2] = z * scale;
        }

        return out;
    },

    convertRotation: function(out, q, fromUp, toUp) {
        if (fromUp === toUp) {
            quat.copy(out, q);
            return out;
        }

        const m = mat4.create();
        const qm = mat4.create();
        const result = mat4.create();

        mat4.fromQuat(qm, q);

        if (fromUp === 'y-up' && toUp === 'z-up') {
            const toZup = mat4.create();
            toZup[0] = 1; toZup[1] = 0; toZup[2] = 0; toZup[3] = 0;
            toZup[4] = 0; toZup[5] = 0; toZup[6] = -1; toZup[7] = 0;
            toZup[8] = 0; toZup[9] = 1; toZup[10] = 0; toZup[11] = 0;
            toZup[12] = 0; toZup[13] = 0; toZup[14] = 0; toZup[15] = 1;

            const fromYup = mat4.create();
            fromYup[0] = 1; fromYup[1] = 0; fromYup[2] = 0; fromYup[3] = 0;
            fromYup[4] = 0; fromYup[5] = 0; fromYup[6] = 1; fromYup[7] = 0;
            fromYup[8] = 0; fromYup[9] = -1; fromYup[10] = 0; fromYup[11] = 0;
            fromYup[12] = 0; fromYup[13] = 0; fromYup[14] = 0; fromYup[15] = 1;

            mat4.multiply(result, toZup, qm);
            mat4.multiply(m, result, fromYup);
        } else if (fromUp === 'z-up' && toUp === 'y-up') {
            const toYup = mat4.create();
            toYup[0] = 1; toYup[1] = 0; toYup[2] = 0; toYup[3] = 0;
            toYup[4] = 0; toYup[5] = 0; toYup[6] = 1; toYup[7] = 0;
            toYup[8] = 0; toYup[9] = -1; toYup[10] = 0; toYup[11] = 0;
            toYup[12] = 0; toYup[13] = 0; toYup[14] = 0; toYup[15] = 1;

            const fromZup = mat4.create();
            fromZup[0] = 1; fromZup[1] = 0; fromZup[2] = 0; fromZup[3] = 0;
            fromZup[4] = 0; fromZup[5] = 0; fromZup[6] = -1; fromZup[7] = 0;
            fromZup[8] = 0; fromZup[9] = 1; fromZup[10] = 0; fromZup[11] = 0;
            fromZup[12] = 0; fromZup[13] = 0; fromZup[14] = 0; fromZup[15] = 1;

            mat4.multiply(result, toYup, qm);
            mat4.multiply(m, result, fromZup);
        } else {
            mat4.copy(m, qm);
        }

        quat.fromMat4(out, m);
        quat.normalize(out, out);
        return out;
    },

    convertEuler: function(out, euler, fromUp, toUp, order = 'ZXY') {
        const q = quat.create();
        quat.fromEulerWithOrder(q, euler[0], euler[1], euler[2], order);
        this.convertRotation(q, q, fromUp, toUp);
        quat.toEuler(out, q, order);
        return out;
    },

    convertOffset: function(out, offset, fromUp, toUp, scale = 1) {
        return this.convertPosition(out, offset, fromUp, toUp, scale);
    }
};

export const JointNameMapping = {
    motionBuilder: {
        'root': 'Hips',
        'spine1': 'Spine',
        'spine2': 'Spine1',
        'spine3': 'Spine2',
        'neck': 'Neck',
        'head': 'Head',
        'jaw': 'Jaw',
        'ear_left': 'LeftEar',
        'ear_right': 'RightEar',
        'shoulder_left': 'LeftShoulder',
        'elbow_left': 'LeftArm',
        'wrist_left': 'LeftForeArm',
        'paw_left': 'LeftHand',
        'shoulder_right': 'RightShoulder',
        'elbow_right': 'RightArm',
        'wrist_right': 'RightForeArm',
        'paw_right': 'RightHand',
        'hip_left': 'LeftUpLeg',
        'knee_left': 'LeftLeg',
        'ankle_left': 'LeftFoot',
        'foot_left': 'LeftToeBase',
        'hip_right': 'RightUpLeg',
        'knee_right': 'RightLeg',
        'ankle_right': 'RightFoot',
        'foot_right': 'RightToeBase',
        'tail1': 'Tail',
        'tail2': 'Tail1',
        'tail3': 'Tail2',
        'tail4': 'Tail3',
        'tail5': 'Tail4'
    },

    vicon: {
        'root': 'Hips',
        'spine1': 'Spine',
        'spine2': 'Spine1',
        'spine3': 'Spine2',
        'neck': 'Neck',
        'head': 'Head',
        'jaw': 'Jaw',
        'ear_left': 'LeftEar',
        'ear_right': 'RightEar',
        'shoulder_left': 'LShoulder',
        'elbow_left': 'LElbow',
        'wrist_left': 'LWrist',
        'paw_left': 'LPaw',
        'shoulder_right': 'RShoulder',
        'elbow_right': 'RElbow',
        'wrist_right': 'RWrist',
        'paw_right': 'RPaw',
        'hip_left': 'LHip',
        'knee_left': 'LKnee',
        'ankle_left': 'LAnkle',
        'foot_left': 'LFoot',
        'hip_right': 'RHip',
        'knee_right': 'RKnee',
        'ankle_right': 'RAnkle',
        'foot_right': 'RFoot',
        'tail1': 'Tail',
        'tail2': 'Tail1',
        'tail3': 'Tail2',
        'tail4': 'Tail3',
        'tail5': 'Tail4'
    },

    generic: {
        'root': 'Root',
        'spine1': 'Spine1',
        'spine2': 'Spine2',
        'spine3': 'Spine3',
        'neck': 'Neck',
        'head': 'Head',
        'jaw': 'Jaw',
        'ear_left': 'Ear_L',
        'ear_right': 'Ear_R',
        'shoulder_left': 'Shoulder_L',
        'elbow_left': 'Elbow_L',
        'wrist_left': 'Wrist_L',
        'paw_left': 'Paw_L',
        'shoulder_right': 'Shoulder_R',
        'elbow_right': 'Elbow_R',
        'wrist_right': 'Wrist_R',
        'paw_right': 'Paw_R',
        'hip_left': 'Hip_L',
        'knee_left': 'Knee_L',
        'ankle_left': 'Ankle_L',
        'foot_left': 'Foot_L',
        'hip_right': 'Hip_R',
        'knee_right': 'Knee_R',
        'ankle_right': 'Ankle_R',
        'foot_right': 'Foot_R',
        'tail1': 'Tail1',
        'tail2': 'Tail2',
        'tail3': 'Tail3',
        'tail4': 'Tail4',
        'tail5': 'Tail5'
    }
};

export function createInverseMapping(mapping) {
    const inverse = {};
    for (const key in mapping) {
        inverse[mapping[key]] = key;
    }
    return inverse;
}

export function mapJointName(name, mapping, direction = 'toExternal') {
    if (direction === 'toExternal') {
        return mapping[name] || name;
    } else {
        const inverse = createInverseMapping(mapping);
        return inverse[name] || name;
    }
}

export function guessJointMapping(externalNames, internalJoints) {
    const mapping = {};
    const usedInternal = new Set();

    for (const externalName of externalNames) {
        const lowerExt = externalName.toLowerCase().replace(/[_\s-]/g, '');

        let bestMatch = null;
        let bestScore = 0;

        for (const joint of internalJoints) {
            if (usedInternal.has(joint.name)) continue;

            const lowerInt = joint.name.toLowerCase().replace(/[_\s-]/g, '');

            if (lowerExt === lowerInt) {
                bestMatch = joint.name;
                bestScore = 100;
                break;
            }

            let score = 0;
            if (lowerExt.includes(lowerInt) || lowerInt.includes(lowerExt)) {
                score = 50;
            }

            if ((lowerExt.includes('left') || lowerExt.includes('l_')) && 
                (lowerInt.includes('left') || lowerInt.includes('_l'))) {
                score += 20;
            }
            if ((lowerExt.includes('right') || lowerExt.includes('r_')) && 
                (lowerInt.includes('right') || lowerInt.includes('_r'))) {
                score += 20;
            }

            const keywords = ['spine', 'neck', 'head', 'jaw', 'ear', 'shoulder', 'elbow', 
                             'wrist', 'paw', 'hip', 'knee', 'ankle', 'foot', 'tail'];
            for (const kw of keywords) {
                if (lowerExt.includes(kw) && lowerInt.includes(kw)) {
                    score += 10;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = joint.name;
            }
        }

        if (bestMatch && bestScore > 0) {
            mapping[externalName] = bestMatch;
            usedInternal.add(bestMatch);
        } else {
            mapping[externalName] = externalName;
        }
    }

    return mapping;
}
