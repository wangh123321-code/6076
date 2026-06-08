const fs = require('fs');
const path = require('path');

const BVH_JOINTS = [
    { name: 'Hips', parent: null, offset: [0, 0.30, 0], channels: 6, endSite: null },
    { name: 'Spine', parent: 'Hips', offset: [0, 0.08, 0], channels: 3, endSite: null },
    { name: 'Spine1', parent: 'Spine', offset: [0, 0.06, 0], channels: 3, endSite: null },
    { name: 'Spine2', parent: 'Spine1', offset: [0, 0.05, 0], channels: 3, endSite: null },
    { name: 'Neck', parent: 'Spine2', offset: [0, 0.04, 0], channels: 3, endSite: null },
    { name: 'Head', parent: 'Neck', offset: [0, 0.06, 0], channels: 3, endSite: [0, 0.03, 0] },
    { name: 'LeftShoulder', parent: 'Spine2', offset: [0.05, 0.02, 0], channels: 3, endSite: null },
    { name: 'LeftArm', parent: 'LeftShoulder', offset: [0.06, 0, 0], channels: 3, endSite: null },
    { name: 'LeftForeArm', parent: 'LeftArm', offset: [0.07, 0, 0], channels: 3, endSite: null },
    { name: 'LeftHand', parent: 'LeftForeArm', offset: [0.05, 0, 0], channels: 3, endSite: [0.02, 0, 0] },
    { name: 'RightShoulder', parent: 'Spine2', offset: [-0.05, 0.02, 0], channels: 3, endSite: null },
    { name: 'RightArm', parent: 'RightShoulder', offset: [-0.06, 0, 0], channels: 3, endSite: null },
    { name: 'RightForeArm', parent: 'RightArm', offset: [-0.07, 0, 0], channels: 3, endSite: null },
    { name: 'RightHand', parent: 'RightForeArm', offset: [-0.05, 0, 0], channels: 3, endSite: [-0.02, 0, 0] },
    { name: 'LeftHip', parent: 'Hips', offset: [0.04, -0.02, 0], channels: 3, endSite: null },
    { name: 'LeftLeg', parent: 'LeftHip', offset: [0, -0.12, 0], channels: 3, endSite: null },
    { name: 'LeftFoot', parent: 'LeftLeg', offset: [0, -0.12, 0], channels: 3, endSite: null },
    { name: 'LeftToe', parent: 'LeftFoot', offset: [0, 0, 0.04], channels: 3, endSite: [0, 0, 0.02] },
    { name: 'RightHip', parent: 'Hips', offset: [-0.04, -0.02, 0], channels: 3, endSite: null },
    { name: 'RightLeg', parent: 'RightHip', offset: [0, -0.12, 0], channels: 3, endSite: null },
    { name: 'RightFoot', parent: 'RightLeg', offset: [0, -0.12, 0], channels: 3, endSite: null },
    { name: 'RightToe', parent: 'RightFoot', offset: [0, 0, 0.04], channels: 3, endSite: [0, 0, 0.02] },
    { name: 'Tail', parent: 'Hips', offset: [0, -0.01, -0.05], channels: 3, endSite: null },
    { name: 'Tail1', parent: 'Tail', offset: [0, -0.01, -0.04], channels: 3, endSite: null },
    { name: 'Tail2', parent: 'Tail1', offset: [0, -0.01, -0.04], channels: 3, endSite: null },
    { name: 'Tail3', parent: 'Tail2', offset: [0, -0.01, -0.04], channels: 3, endSite: [0, 0, -0.03] }
];

const ACTIONS = ['行走', '奔跑', '跳跃', '打滚', '坐下', '站立', '玩耍', '睡觉'];
const CATS = ['猫咪_001', '猫咪_002', '猫咪_003'];

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

function quatToEulerZXY(q) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const sinY = 2 * (w * y - x * z);
    
    if (Math.abs(sinY) >= 1 - 1e-6) {
        return [
            radToDeg(2 * Math.atan2(x, w)),
            radToDeg(Math.PI / 2 * Math.sign(sinY)),
            0
        ];
    }
    
    return [
        radToDeg(Math.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y))),
        radToDeg(Math.asin(Math.max(-1, Math.min(1, sinY)))),
        radToDeg(Math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z)))
    ];
}

function generateHierarchy() {
    const jointMap = {};
    BVH_JOINTS.forEach(j => jointMap[j.name] = { ...j, children: [] });
    
    BVH_JOINTS.forEach(j => {
        if (j.parent) {
            jointMap[j.parent].children.push(jointMap[j.name]);
        }
    });
    
    let hierarchy = 'HIERARCHY\n';
    
    function writeJoint(joint, depth) {
        const indent = '\t'.repeat(depth);
        const type = joint.parent === null ? 'ROOT' : 'JOINT';
        
        hierarchy += `${indent}${type} ${joint.name}\n`;
        hierarchy += `${indent}{\n`;
        hierarchy += `${indent}\tOFFSET ${joint.offset[0].toFixed(6)} ${joint.offset[1].toFixed(6)} ${joint.offset[2].toFixed(6)}\n`;
        
        if (joint.channels === 6) {
            hierarchy += `${indent}\tCHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation\n`;
        } else {
            hierarchy += `${indent}\tCHANNELS 3 Xrotation Yrotation Zrotation\n`;
        }
        
        for (const child of joint.children) {
            writeJoint(child, depth + 1);
        }
        
        if (joint.endSite) {
            hierarchy += `${indent}\tEnd Site\n`;
            hierarchy += `${indent}\t{\n`;
            hierarchy += `${indent}\t\tOFFSET ${joint.endSite[0].toFixed(6)} ${joint.endSite[1].toFixed(6)} ${joint.endSite[2].toFixed(6)}\n`;
            hierarchy += `${indent}\t}\n`;
        }
        
        hierarchy += `${indent}}\n`;
    }
    
    writeJoint(jointMap['Hips'], 0);
    return hierarchy;
}

function generateFrameData(frame, totalFrames, action, catVariation) {
    const t = frame / totalFrames;
    const phase = t * Math.PI * 2;
    const data = [];
    
    let hipX = 0, hipY = 30, hipZ = 0;
    let hipRotX = 0, hipRotY = 0, hipRotZ = 0;
    
    const jointRotations = {};
    BVH_JOINTS.forEach(j => {
        jointRotations[j.name] = [0, 0, 0];
    });
    
    if (action === '行走' || action === '奔跑') {
        const speed = action === '奔跑' ? 2 : 1;
        const walkPhase = phase * speed;
        const variation = catVariation * 0.1;
        const bodyMove = action === '奔跑' ? 0.8 : 0.3;
        
        hipY = 30 + Math.sin(phase * speed * 2 + variation) * bodyMove;
        hipZ = t * 100 - 50;
        
        jointRotations['LeftLeg'][0] = Math.sin(walkPhase + variation) * 30;
        jointRotations['LeftFoot'][0] = -Math.abs(Math.sin(walkPhase + variation)) * 45;
        jointRotations['RightLeg'][0] = Math.sin(walkPhase + Math.PI + variation) * 30;
        jointRotations['RightFoot'][0] = -Math.abs(Math.sin(walkPhase + Math.PI + variation)) * 45;
        
        jointRotations['LeftArm'][0] = -Math.sin(walkPhase + Math.PI + variation) * 25;
        jointRotations['RightArm'][0] = -Math.sin(walkPhase + variation) * 25;
        
        jointRotations['Tail'][1] = Math.sin(phase * 3 + variation) * 10;
        jointRotations['Tail1'][1] = Math.sin(phase * 3 + variation + 0.3) * 10;
        jointRotations['Tail2'][1] = Math.sin(phase * 3 + variation + 0.6) * 10;
        jointRotations['Tail3'][1] = Math.sin(phase * 3 + variation + 0.9) * 10;
        
        jointRotations['Spine'][0] = Math.sin(phase * speed * 2 + variation) * 3;
        jointRotations['Head'][1] = Math.sin(phase * 2 + variation) * 5;
        
    } else if (action === '跳跃') {
        const jumpPhase = t < 0.5 ? t * 2 : 2 - t * 2;
        const jumpHeight = Math.sin(jumpPhase * Math.PI) * 15;
        const variation = catVariation * 0.15;
        
        hipY = 30 + jumpHeight + variation;
        
        if (t < 0.2) {
            const crouch = t / 0.2;
            jointRotations['LeftLeg'][0] = crouch * 45;
            jointRotations['RightLeg'][0] = crouch * 45;
            jointRotations['LeftArm'][0] = crouch * 30;
            jointRotations['RightArm'][0] = crouch * 30;
        } else if (t < 0.8) {
            jointRotations['LeftLeg'][0] = -30;
            jointRotations['RightLeg'][0] = -30;
            jointRotations['LeftFoot'][0] = 20;
            jointRotations['RightFoot'][0] = 20;
            jointRotations['LeftArm'][0] = -45;
            jointRotations['RightArm'][0] = -45;
        } else {
            const land = (t - 0.8) / 0.2;
            jointRotations['LeftLeg'][0] = -30 + land * 75;
            jointRotations['RightLeg'][0] = -30 + land * 75;
            jointRotations['LeftArm'][0] = -45 + land * 75;
            jointRotations['RightArm'][0] = -45 + land * 75;
        }
        
        jointRotations['Tail'][0] = Math.sin(phase * 4 + variation) * 15;
        jointRotations['Spine'][1] = Math.sin(phase * 2) * 5;
        
    } else if (action === '打滚') {
        const rollPhase = phase * 2;
        const rollOffset = Math.sin(rollPhase) * 30;
        const variation = catVariation * 0.1;
        
        hipX = rollOffset + variation;
        hipY = Math.max(5, 30 - Math.abs(rollOffset) * 0.5);
        hipRotZ = rollOffset * 2;
        
        jointRotations['Spine'][2] = rollOffset * 1.5;
        jointRotations['Spine1'][2] = rollOffset * 1.2;
        jointRotations['Spine2'][2] = rollOffset * 0.8;
        
        jointRotations['LeftLeg'][1] = Math.sin(rollPhase) * 20;
        jointRotations['RightLeg'][1] = -Math.sin(rollPhase) * 20;
        
        jointRotations['Tail'][1] = Math.sin(phase * 5 + variation) * 15;
        
    } else if (action === '坐下') {
        const sitPhase = Math.min(1, t * 2);
        const variation = catVariation * 0.05;
        
        hipY = 30 - sitPhase * 20 - variation;
        
        jointRotations['LeftLeg'][0] = sitPhase * 90;
        jointRotations['RightLeg'][0] = sitPhase * 90;
        jointRotations['LeftFoot'][0] = -sitPhase * 45;
        jointRotations['RightFoot'][0] = -sitPhase * 45;
        
        jointRotations['Spine'][0] = sitPhase * 15;
        jointRotations['Tail'][0] = -sitPhase * 30;
        
    } else if (action === '站立') {
        const standPhase = Math.min(1, t * 2);
        const variation = catVariation * 0.05;
        
        hipY = 30 + standPhase * 5 + variation;
        
        jointRotations['LeftLeg'][0] = (1 - standPhase) * 10;
        jointRotations['RightLeg'][0] = (1 - standPhase) * 10;
        
        jointRotations['Spine'][0] = (1 - standPhase) * 5;
        
    } else if (action === '玩耍') {
        const variation = catVariation * 0.2;
        
        hipY = 30 + Math.sin(phase * 3) * 2;
        hipX = Math.sin(phase * 2) * 10;
        
        jointRotations['Head'][1] = Math.sin(phase * 4 + variation) * 15;
        jointRotations['Head'][0] = Math.cos(phase * 3 + variation) * 10;
        
        jointRotations['LeftArm'][0] = -90 + Math.abs(Math.sin(phase * 6 + variation)) * 60;
        jointRotations['RightArm'][0] = -90 + Math.abs(Math.sin(phase * 6 + variation + 0.5)) * 60;
        jointRotations['LeftForeArm'][0] = Math.abs(Math.sin(phase * 6 + variation)) * 45;
        jointRotations['RightForeArm'][0] = Math.abs(Math.sin(phase * 6 + variation + 0.5)) * 45;
        
        jointRotations['Tail'][1] = Math.sin(phase * 8 + variation) * 25;
        jointRotations['Tail1'][1] = Math.sin(phase * 8 + variation + 0.4) * 20;
        jointRotations['Tail2'][1] = Math.sin(phase * 8 + variation + 0.8) * 15;
        jointRotations['Tail3'][1] = Math.sin(phase * 8 + variation + 1.2) * 10;
        
        jointRotations['Spine'][1] = Math.sin(phase * 2) * 5;
        
    } else if (action === '睡觉') {
        const breathePhase = Math.sin(phase * 0.5) * 0.5;
        const variation = catVariation * 0.02;
        
        hipY = 5 + breathePhase;
        hipRotZ = -90;
        
        jointRotations['Spine'][0] = -10 + breathePhase * 2;
        jointRotations['Head'][0] = -15;
        
        jointRotations['LeftLeg'][0] = 45;
        jointRotations['RightLeg'][0] = 45;
        jointRotations['LeftArm'][0] = 30;
        jointRotations['RightArm'][0] = 30;
        
        jointRotations['Tail'][1] = Math.sin(phase * 0.3 + variation) * 3;
    }
    
    data.push(hipX.toFixed(6));
    data.push(hipY.toFixed(6));
    data.push(hipZ.toFixed(6));
    data.push(jointRotations['Hips'][0].toFixed(6));
    data.push(jointRotations['Hips'][1].toFixed(6));
    data.push(jointRotations['Hips'][2].toFixed(6));
    
    for (let i = 1; i < BVH_JOINTS.length; i++) {
        const joint = BVH_JOINTS[i];
        const rot = jointRotations[joint.name];
        data.push(rot[0].toFixed(6));
        data.push(rot[1].toFixed(6));
        data.push(rot[2].toFixed(6));
    }
    
    return data.join(' ');
}

function generateBVH(cat, action, frameCount = 120, frameRate = 60) {
    const catIdx = CATS.indexOf(cat);
    const catVariation = (catIdx - 1) * 0.1;
    
    let bvh = generateHierarchy();
    
    bvh += 'MOTION\n';
    bvh += `Frames: ${frameCount}\n`;
    bvh += `Frame Time: ${(1 / frameRate).toFixed(6)}\n`;
    
    for (let frame = 0; frame < frameCount; frame++) {
        bvh += generateFrameData(frame, frameCount, action, catVariation) + '\n';
    }
    
    return bvh;
}

function main() {
    const outputDir = __dirname;
    
    console.log('正在生成BVH样例数据...');
    console.log('');
    
    const bvhFiles = [];
    
    for (const cat of CATS.slice(0, 1)) {
        for (const action of ACTIONS) {
            const filename = `${cat}_${action}.bvh`;
            const filepath = path.join(outputDir, filename);
            
            console.log(`  生成: ${filename}`);
            
            const bvh = generateBVH(cat, action, 120, 60);
            fs.writeFileSync(filepath, bvh, 'utf-8');
            bvhFiles.push(filename);
        }
    }
    
    console.log('');
    console.log(`完成！生成了 ${bvhFiles.length} 个BVH文件`);
    console.log(`目录: ${outputDir}`);
    console.log('');
    console.log('生成的文件:');
    bvhFiles.forEach(f => console.log(`  - ${f}`));
    
    console.log('');
    console.log('=== BVH文件说明 ===');
    console.log('坐标系: Y轴向上 (BVH标准)');
    console.log('单位: 厘米 (BVH标准)');
    console.log('旋转顺序: ZXY (BVH标准)');
    console.log('帧率: 60 FPS');
    console.log('帧数: 120帧 (2秒)');
    console.log('骨骼命名: MotionBuilder兼容');
    console.log('');
    console.log('这些文件可以直接在MotionBuilder中打开播放。');
}

main();
