const fs = require('fs');
const path = require('path');

const CatSkeletonDefinition = {
    joints: [
        { name: 'root', defaultPos: [0, 1, 0] },
        { name: 'spine1', defaultPos: [0, 1.2, -0.2] },
        { name: 'spine2', defaultPos: [0, 1.3, -0.5] },
        { name: 'spine3', defaultPos: [0, 1.35, -0.8] },
        { name: 'neck', defaultPos: [0, 1.4, -1.1] },
        { name: 'head', defaultPos: [0, 1.45, -1.4] },
        { name: 'jaw', defaultPos: [0, 1.35, -1.55] },
        { name: 'ear_left', defaultPos: [0.15, 1.65, -1.35] },
        { name: 'ear_right', defaultPos: [-0.15, 1.65, -1.35] },
        { name: 'shoulder_left', defaultPos: [0.35, 1.3, -0.7] },
        { name: 'elbow_left', defaultPos: [0.4, 0.8, -0.65] },
        { name: 'wrist_left', defaultPos: [0.4, 0.3, -0.6] },
        { name: 'paw_left', defaultPos: [0.4, 0.05, -0.58] },
        { name: 'shoulder_right', defaultPos: [-0.35, 1.3, -0.7] },
        { name: 'elbow_right', defaultPos: [-0.4, 0.8, -0.65] },
        { name: 'wrist_right', defaultPos: [-0.4, 0.3, -0.6] },
        { name: 'paw_right', defaultPos: [-0.4, 0.05, -0.58] },
        { name: 'hip_left', defaultPos: [0.35, 1.1, 0.3] },
        { name: 'knee_left', defaultPos: [0.35, 0.6, 0.4] },
        { name: 'ankle_left', defaultPos: [0.3, 0.2, 0.2] },
        { name: 'foot_left', defaultPos: [0.3, 0.05, 0.08] },
        { name: 'hip_right', defaultPos: [-0.35, 1.1, 0.3] },
        { name: 'knee_right', defaultPos: [-0.35, 0.6, 0.4] },
        { name: 'ankle_right', defaultPos: [-0.3, 0.2, 0.2] },
        { name: 'foot_right', defaultPos: [-0.3, 0.05, 0.08] },
        { name: 'tail1', defaultPos: [0, 1.1, 0.5] },
        { name: 'tail2', defaultPos: [0, 1, 0.9] },
        { name: 'tail3', defaultPos: [0, 0.9, 1.25] },
        { name: 'tail4', defaultPos: [0, 0.8, 1.5] },
        { name: 'tail5', defaultPos: [0, 0.75, 1.7] }
    ]
};

const ACTIONS = ['行走', '奔跑', '跳跃', '打滚', '坐下', '站立', '玩耍', '睡觉'];
const CATS = ['猫咪_001', '猫咪_002', '猫咪_003', '猫咪_004', '猫咪_005'];

function generatePose(frame, totalFrames, action, catVariation) {
    const t = frame / totalFrames;
    const phase = t * Math.PI * 2;
    const pose = {};

    for (const joint of CatSkeletonDefinition.joints) {
        const pos = [...joint.defaultPos];
        const name = joint.name;

        if (action === '行走' || action === '奔跑') {
            const speed = action === '奔跑' ? 2 : 1;
            const walkPhase = phase * speed;
            const variation = catVariation * 0.1;

            if (name.includes('front_left')) {
                pos[1] += Math.sin(walkPhase + variation) * 0.1;
                pos[2] += Math.cos(walkPhase + variation) * 0.05;
            } else if (name.includes('front_right')) {
                pos[1] += Math.sin(walkPhase + Math.PI + variation) * 0.1;
                pos[2] += Math.cos(walkPhase + Math.PI + variation) * 0.05;
            } else if (name.includes('back_left')) {
                pos[1] += Math.sin(walkPhase + Math.PI + variation) * 0.12;
                pos[2] += Math.cos(walkPhase + Math.PI + variation) * 0.06;
            } else if (name.includes('back_right')) {
                pos[1] += Math.sin(walkPhase + variation) * 0.12;
                pos[2] += Math.cos(walkPhase + variation) * 0.06;
            } else if (name.includes('tail')) {
                pos[0] += Math.sin(phase * 3 + variation) * 0.03;
                pos[2] += Math.cos(phase * 2 + variation) * 0.02;
            } else if (name === 'head') {
                pos[1] += Math.sin(phase * 2 + variation) * 0.02;
            }

            const bodyMove = action === '奔跑' ? 0.08 : 0.03;
            if (name.includes('spine') || name === 'head' || name === 'neck' || name === 'root') {
                pos[1] += Math.sin(phase * speed * 2 + variation) * bodyMove;
            }
        } else if (action === '跳跃') {
            const jumpPhase = t < 0.5 ? t * 2 : 2 - t * 2;
            const jumpHeight = Math.sin(jumpPhase * Math.PI) * 0.5;
            const variation = catVariation * 0.15;

            if (name.includes('spine') || name === 'head' || name === 'neck' || name === 'root') {
                pos[1] += jumpHeight + variation;
            }
            if (name.includes('paw') || name.includes('foot')) {
                pos[1] += jumpHeight * 0.8 + variation;
            }
            if (name.includes('tail')) {
                pos[1] += Math.sin(phase * 4 + variation) * 0.1;
            }
        } else if (action === '打滚') {
            const rollPhase = phase * 2;
            const rollOffset = Math.sin(rollPhase) * 0.3;
            const variation = catVariation * 0.1;

            if (name.includes('spine') || name === 'head' || name === 'neck' || name === 'root') {
                pos[0] += rollOffset + variation;
                pos[1] = Math.max(0.1, pos[1] - Math.abs(rollOffset) * 0.5);
            }
            if (name.includes('tail')) {
                pos[0] += Math.sin(phase * 5 + variation) * 0.1;
            }
        } else if (action === '玩耍') {
            const variation = catVariation * 0.2;
            if (name === 'head') {
                pos[0] += Math.sin(phase * 4 + variation) * 0.08;
                pos[1] += Math.cos(phase * 3 + variation) * 0.05;
            }
            if (name.includes('paw')) {
                pos[1] += Math.abs(Math.sin(phase * 6 + variation)) * 0.15;
                pos[0] += Math.sin(phase * 4 + variation) * 0.1;
            }
            if (name.includes('tail')) {
                pos[0] += Math.sin(phase * 8 + variation) * 0.15;
                pos[1] += Math.cos(phase * 6 + variation) * 0.05;
            }
        } else if (action === '坐下') {
            const sitPhase = Math.min(1, t * 2);
            const variation = catVariation * 0.05;

            if (name.includes('spine') || name === 'head' || name === 'neck' || name === 'root') {
                pos[1] -= sitPhase * 0.3 - variation;
            }
            if (name.includes('hip') || name.includes('knee') || name.includes('ankle') || name.includes('foot')) {
                pos[1] -= sitPhase * 0.4;
            }
        } else if (action === '站立') {
            const standPhase = Math.min(1, t * 2);
            const variation = catVariation * 0.05;

            if (name.includes('spine') || name === 'head' || name === 'neck' || name === 'root') {
                pos[1] += standPhase * 0.2 + variation;
            }
        } else if (action === '睡觉') {
            const breathePhase = Math.sin(phase * 0.5) * 0.02;
            if (name.includes('spine') || name === 'head' || name === 'neck') {
                pos[1] = Math.max(0.15, pos[1] - 0.6) + breathePhase;
            }
            if (name.includes('tail')) {
                pos[0] += Math.sin(phase * 0.3) * 0.01;
            }
        }

        pose[name] = {
            x: pos[0].toFixed(6),
            y: pos[1].toFixed(6),
            z: pos[2].toFixed(6),
            rot_x: '0.000000',
            rot_y: '0.000000',
            rot_z: '0.000000',
            rot_w: '1.000000'
        };
    }

    return pose;
}

function generateCSV(cat, action, frameCount = 240, frameRate = 60) {
    const catIdx = CATS.indexOf(cat);
    const catVariation = (catIdx - 2) * 0.1;

    let csv = '';
    csv += `# Cat: ${cat}\n`;
    csv += `# Action: ${action}\n`;
    csv += `# FPS: ${frameRate}\n`;
    csv += `# Frames: ${frameCount}\n`;
    csv += `# Generated: ${new Date().toISOString()}\n`;

    const headers = ['frame'];
    for (const joint of CatSkeletonDefinition.joints) {
        headers.push(`${joint.name}_x`);
        headers.push(`${joint.name}_y`);
        headers.push(`${joint.name}_z`);
        headers.push(`${joint.name}_rot_x`);
        headers.push(`${joint.name}_rot_y`);
        headers.push(`${joint.name}_rot_z`);
        headers.push(`${joint.name}_rot_w`);
    }
    csv += headers.join(',') + '\n';

    for (let frame = 0; frame < frameCount; frame++) {
        const pose = generatePose(frame, frameCount, action, catVariation);
        const row = [frame.toString()];

        for (const joint of CatSkeletonDefinition.joints) {
            const p = pose[joint.name];
            row.push(p.x, p.y, p.z, p.rot_x, p.rot_y, p.rot_z, p.rot_w);
        }

        csv += row.join(',') + '\n';
    }

    return csv;
}

function main() {
    const outputDir = __dirname;

    console.log('正在生成示例CSV数据...');

    for (const cat of CATS) {
        for (const action of ACTIONS) {
            const filename = `${cat}_${action}.csv`;
            const filepath = path.join(outputDir, filename);
            
            console.log(`  生成: ${filename}`);
            
            const csv = generateCSV(cat, action, 240, 60);
            fs.writeFileSync(filepath, csv, 'utf-8');
        }
    }

    console.log('\n完成！生成了 ' + (CATS.length * ACTIONS.length) + ' 个CSV文件');
    console.log(`目录: ${outputDir}`);
}

main();
