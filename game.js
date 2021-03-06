/*
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global Phaser */

function loadLevel(room) {
    const game = new Phaser.Game($(window).width(), $(window).height(), Phaser.AUTO, '', {
        preload: preload,
        create: create,
        update: update
    });
    let first = true;
    let bounds_x = 0;
    let bounds_y = 0;
    let player;
    let goal;
    let platforms;
    let platforms_fall;
    let damage;
    let glue;
    let extrajump;
    let texts;
    let keyboard;
    let vgc;
    let left;
    let right;
    let jump;
    let jump_boost = false;
    let jump_glue_cd = 0;

    function preload() {
        game.stage.backgroundColor = '#78909C';
        game.load.baseURL = 'assets/';
        game.load.crossOrigin = 'anonymous';
        game.load.spritesheet('player', 'sprites/player.png', 24, 20, 24);
        game.load.image('platform', 'sprites/platform.png');
        game.load.image('damage', 'sprites/damage.png');
        game.load.image('goal', 'sprites/goal.png');
        game.load.image('glue', 'sprites/glue.png');
        game.load.image('extrajump', 'sprites/extrajump.png');
        game.load.image('platform_fall', 'sprites/platform_fall.png');
        game.load.image('vgc_button', 'sprites/vgc_button.png?v=1.0');
    }

    function create() {
        platforms = game.add.physicsGroup();
        platforms_fall = game.add.physicsGroup();
        damage = game.add.physicsGroup();
        glue = game.add.physicsGroup();
        extrajump = game.add.physicsGroup();
        texts = game.add.group();
        vgc = game.add.group();

        room['objects'].forEach(function(item, index) {
            const type = item['type'];
            const position = item['position'];
            let size = item['size'];
            let depth = item['depth'];
            if (type === "text") {
                const text = game.add.text(position[0], position[1], item.text, {
                    font: '16px Arial',
                    fill: '#FFF',
                    align: 'center'
                });
                texts.add(text);
                return;
            }
            if (size === undefined) size = [0, 0];
            if (depth === undefined) depth = 0;
            const sprite = game.add.sprite(position[0], position[1], type);
            if (position[0] + size[0] > bounds_x) bounds_x = position[0] + size[0];
            if (position[1] + size[1] > bounds_y) bounds_y = position[1] + size[1];
            if (size[0] !== 0) sprite.scale.setTo(size[0], size[1]);
            if (depth !== 0) sprite.z = depth;
            switch (type) {
                case 'player': player = sprite; break;
                case 'platform': platforms.add(sprite); break;
                case 'platform_fall': platforms_fall.add(sprite); break;
                case 'glue': glue.add(sprite); break;
                case 'extrajump': extrajump.add(sprite); break;
                case 'damage': damage.add(sprite); break;
                case 'goal': goal = sprite; break;
            }
        });
        if (bounds_x < $(window).width()) bounds_x = $(window).width();
        if (bounds_y < $(window).height()) bounds_y = $(window).height();
        game.world.setBounds(0, 0, bounds_x, bounds_y);
        game.camera.follow(player, Phaser.Camera.FOLLOW_LOCKON);
        game.physics.arcade.enable(player);
        player.body.collideWorldBounds = true;
        player.body.gravity.y = 1000;
        keyboard = {};
        keyboard['left'] = game.input.keyboard.addKey(Phaser.Keyboard.Q);
        keyboard['right'] = game.input.keyboard.addKey(Phaser.Keyboard.D);
        keyboard['up'] = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
        platforms.setAll('body.immovable', true);
        platforms_fall.setAll('body.immovable', true);
        damage.setAll('body.immovable', true);
        glue.setAll('body.immovable', true);
        extrajump.setAll('body.immovable', true);
        game.physics.enable(goal, Phaser.Physics.ARCADE);
        goal.body.immovable = true;

        if (first) {
            /* Virtual game controller */
            vgc_left = game.add.button(0, game.height-68, 'vgc_button', null, this);
            vgc_left.scale.setTo(1.5, 1);
            vgc_left.fixedToCamera = true;
            vgc_left.events.onInputOver.add(function(){left=true;});
            vgc_left.events.onInputOut.add(function(){left=false;});
            vgc_left.events.onInputDown.add(function(){left=true;});
            vgc_left.events.onInputUp.add(function(){left=false;});
            vgc.add(vgc_left);

            vgc_jump = game.add.button(game.width-68, game.height-68, 'vgc_button', null, this);
            vgc_jump.fixedToCamera = true;
            vgc_jump.events.onInputOver.add(function(){jump=true;});
            vgc_jump.events.onInputOut.add(function(){jump=false;});
            vgc_jump.events.onInputDown.add(function(){jump=true;});
            vgc_jump.events.onInputUp.add(function(){jump=false;});
            vgc.add(vgc_jump);

            vgc_right = game.add.button(100, game.height-68, 'vgc_button', null, this);
            vgc_right.scale.setTo(1.5, 1);
            vgc_right.fixedToCamera = true;
            vgc_right.events.onInputOver.add(function(){right=true;});
            vgc_right.events.onInputOut.add(function(){right=false;});
            vgc_right.events.onInputDown.add(function(){right=true;});
            vgc_right.events.onInputUp.add(function(){right=false;});
            vgc.add(vgc_right);
        }
        first = false;
    }

    function restart() {
        player.kill();
        goal.kill();
        platforms.removeAll();
        platforms_fall.removeAll();
        damage.removeAll();
        extrajump.removeAll();
        glue.removeAll();
        texts.removeAll();
        create();
    }

    function update() {
        game.physics.arcade.collide(player, platforms);
        game.physics.arcade.collide(player, platforms_fall, platformFall);
        game.physics.arcade.collide(player, glue, playerGlue);
        game.physics.arcade.collide(player, extrajump, enableExtraJump);
        game.physics.arcade.collide(player, goal, playerWin);
        game.physics.arcade.collide(player, damage, playerDeath);

        player.body.velocity.x = 0;

        if (keyboard['left'].isDown || left) player.body.velocity.x = -240;
        else if (keyboard['right'].isDown || right) player.body.velocity.x = 240;


        if ((keyboard['up'].isDown || jump) && (player.body.onFloor() || player.body.touching.down))
            if(jump_boost) player.body.velocity.y = -700;
            else player.body.velocity.y = -600;

        if ((keyboard['up'].isDown || jump) && jump_glue_cd !== 0) {
            player.body.velocity.y = -300;
            jump_glue_cd = 0;
        }

        if (player.body.velocity.x > 0) player.frame = 1;
        else if (player.body.velocity.x < 0)  player.frame = 2;
        else player.frame = 0;
        if (player.body.velocity.y < 0) player.frame = 3;
        else if (player.body.velocity.y > 0) player.frame = 4;
        if (jump_glue_cd !== 0) jump_glue_cd--;
        jump_boost = false;
    }

    function platformFall(player, platform_fall) {
        platform_fall.body.velocity.y = 50;
    }

    function playerGlue(player, glue) {
        player.body.velocity.y = 0;
        jump_glue_cd = 10;
    }

    function enableExtraJump() {
        jump_boost = true;
    }

    function playerWin(player, goal) {
        const win_text = game.add.text(game.width / 2, game.height / 2, 'Tu as gagné !', {
            font: '40px Arial',
            fill: '#2E7D32',
            align: 'center'
        });
        win_text.anchor.setTo(0.5, 0.5);
        win_text.fixedToCamera = true;
        texts.add(win_text);
        if (getParameterByName('storage', window.location.href) === ""){
            try {
                const levels = JSON.parse(localStorage.getItem("nubium_levels"));
                levels[getParameterByName('level', window.location.href)].completed = true;
                localStorage.setItem("nubium_levels", JSON.stringify(levels));
            } catch(e) {
                alert("Erreur inconnue :(");
            }
        }
        goal.kill();
    }

    function playerDeath(player, damage) {
        restart();
    }

    $(window).resize(function() {
        game.scale.setGameSize($(window).width(), $(window).height());
    });
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

let level;
if (getParameterByName('storage', window.location.href) === "") {
    try {
        level = JSON.parse(localStorage.getItem("nubium_levels"))[getParameterByName('level', window.location.href)];
        loadLevel(level);
    } catch (e) {
        alert("Niveau invalide :(");
    }
} else if(getParameterByName('editor', window.location.href) === "") {
    try {
        level = JSON.parse(localStorage.getItem("nubium_editor"));
        loadLevel(level);
        $('#main-menu').remove();
    } catch (e) {
        alert("Niveau invalide.");
    }
}