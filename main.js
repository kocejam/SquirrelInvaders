function run() {
    var backgroundCanvas = document.getElementById('backgroundCanvas'),
        cBack = backgroundCanvas.getContext('2d'),
        playerCanvas = document.getElementById('playerCanvas'),
        cPlayer = playerCanvas.getContext('2d'),
        mainCanvas = document.getElementById('mainCanvas'),
        cMain = mainCanvas.getContext('2d');

    /*
    Set initializing variables.
     */
    var innerWidth = 500,
        innerHeight = 600;
    backgroundCanvas.width = innerWidth;
    backgroundCanvas.height = innerHeight;
    playerCanvas.width = innerWidth;
    playerCanvas.height = innerHeight;
    mainCanvas.width = innerWidth;
    mainCanvas.height = innerHeight;
    var rect = backgroundCanvas.getBoundingClientRect();
    var player_width = 70,
        player_height = 50,
        laser_width = 20,
        laser_height = 40,
        enemy_width = 50,
        enemy_width = 50,
        enemy_height = 50;
    var speedMultiplier = 2,
        spawnMultiplier = 2;
    var score = 0,
        level = 1,
        clicks = 0;
    var off = false;


    /**
     * Singleton for images
     */
    var imageSingleton = new function() {
        // Define images
        this.background = new Image();
        this.player = new Image();
        this.laser = new Image();
        this.enemy = new Image();

        // Set images src
        this.background.src = "images/bg.png";
        this.player.src = "images/owl.png";
        this.laser.src = "images/hotdog.jpg";
        this.enemy.src = "images/squirrel.png";
    };

    /**
     * Abstract object used for drawing. Not meant to be instantiated!
     */
    function Drawing() {
        this.init = function(x, y, width, height) {
            // Default variables
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        };
        this.speed = 0;
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        // Define abstract function to be implemented in child objects
        this.draw = function() {
        };
    }


    document.getElementById("restart").onclick = function restartButton() {
        document.getElementById("loser").style.visibility = "hidden";
        gameInit();
    };

    function lose() {
        if (score > getBest()) {
            localStorage.setItem("best", score);
        }
        updateScoreBoard();
        off = true;
        speedMultiplier = 2;
        spawnMultiplier = 2;
        score = 0;
        level = 1;
        clicks = 0;
        gameKill();
        document.getElementById("loser").style.visibility = "visible";
    }

    /**
     * Creates the Background object which will inherit properties from
     * Drawing. Will be used to manipulate whats being drawn on the
     * background canvas. Implements a panning image effect.
     */
    function Background() {
        this.speed = 1;

        this.draw = function() {
            this.y += this.speed;
            this.context.drawImage(imageSingleton.background, this.x, this.y);
            this.context.drawImage(imageSingleton.background, this.x, this.y - this.canvasHeight);
            if (this.y >= this.canvasHeight)
                this.y = 0;
        };
    }
    // Set Background to inherit properties from Drawing
    Background.prototype = new Drawing();

    /**
     * Custom Pool data structure object. Holds objects to be managed.
     * Assumes that its objects use the "alive" field to see if it is in use or not.
     */
    function Pool(maxSize, objectName) {
        var size = maxSize; // Max lasers allowed in the pool
        var pool = [];
        /*
         * Populates the pool array with objects, depending on which is specified
         */
        this.init = function() {
            if (objectName == "laser") {
                for (var i = 0; i < size; i++) {
                    // Initialize the laser object
                    var laser = new Laser();
                    laser.init(0,0, imageSingleton.laser.width,
                        imageSingleton.laser.height);
                    pool[i] = laser;
                }
            } else if (objectName == "enemy") {
                for (var j = 0; j < size; j++) {
                    // Initialize the laser object
                    var enemy = new Enemy();
                    enemy.init(0,0, imageSingleton.laser.width,
                        imageSingleton.laser.height);
                    pool[j] = enemy;
                }
            }
        };
        /*
         * Grabs the last dead item in the pool, wakes it up, and moves it to the front.
         */
        this.get = function(x, y, speed) {
            if(!pool[size - 1].alive) {
                pool[size - 1].spawn(x, y, speed);
                pool.unshift(pool.pop());
            }
        };

        this.getPool = function() {
            return pool;
        };

        this.killPool = function() {
            for (var i = 0; i < size; i++) {
                if (pool[i].alive) {
                    this.clear(i);
                }
                else
                    break;
            }
        };

        this.clear = function(i) {
            pool[i].reset();
            pool.push((pool.splice(i,1))[0]);
        };

        this.drawAll = function() {
            for (var i = 0; i < size; i++) {
                if (pool[i].alive) {
                    if (pool[i].draw()) {
                        this.clear(i);
                    }
                }
                else
                    break;
            }
        };
    }

    /**
     * Given two objects, both with an x, y, width, and height,
     * this function will return if the two currently are colliding.
     */
    function collisionCheck(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y;

    }

    /**
     * Given two Pool objects, this function will tell if
     * any if their alive objects are colliding, and if so,
     * will kill both of them within their respective pools.
     */
    function poolCheck(poolOne, poolTwo) {
        var pool1 = poolOne.getPool();
        var pool2 = poolTwo.getPool();
        for (var i = 0; i < pool1.length; i++) {
            if (pool1[i].alive) {
                for (var j = 0; j < pool2.length; j++) {
                    if (pool2[j].alive) {
                        if (collisionCheck(pool1[i], pool2[j])) {
                            poolOne.clear(i);
                            poolTwo.clear(j);
                            score += 1;
                        }
                    } else {
                        break;
                    }
                }
            } else {
                break;
            }
        }
    }

    /**
     * Creates the Laser object with which the player shoots.
     */
    function Laser() {
        this.alive = false;
        /*
         * Sets the laser values
         */
        this.spawn = function(x, y, speed) {
            this.x = x;
            this.y = y;
            this.width = laser_width;
            this.height = laser_height;
            this.speed = speed;
            this.alive = true;
        };

        this.draw = function() {
            this.context.clearRect(
                this.x - laser_width/2, this.y,
                laser_width, laser_height);
            this.y -= this.speed;
            if (this.y <= 0 - laser_height) {
                return true;
            }
            else {
                this.context.drawImage(imageSingleton.laser,
                    this.x - laser_width/2, this.y,
                    laser_width, laser_height);
            }
        };
        /*
         * Resets the laser values
         */
        this.reset = function() {
            clicks += 1;
            this.context.clearRect(
                this.x - laser_width/2, this.y,
                laser_width, laser_height);
            this.x = 0;
            this.y = 0;
            this.speed = 0;
            this.alive = false;
        };
    }
    Laser.prototype = new Drawing();

    /**
     * Create the Player object that the user controls.
     */
    function Player() {
        this.lasers = new Pool(30, "laser");
        this.lasers.init();
        this.draw = function() {
            this.context.drawImage(imageSingleton.player,
                this.x, this.y,
                player_width, player_height);
        };
        this.checkBounds = function() {
            if (this.x <= 0) {  // Check to see if the player is
                this.x = 0;     // off the right of the screen.
            }
            if (this.x + player_width >= innerWidth) { // Check to see if the player
                this.x = innerWidth - player_width;     // if off the left of the screen,
            }
        };
        this.shoot = function() {
            this.lasers.get(this.x + player_width / 2, this.y, 15);
        };
    }
    Player.prototype = new Drawing();

    /**
     * Create the Enemy ship object.
     */
    function Enemy() {
        this.alive = false;
        /*
         * Sets the Enemy values
         */
        this.spawn = function(x, y, speed) {
            this.x = x;
            this.y = y;
            this.width = enemy_width;
            this.height = enemy_height;
            var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
            this.speed = speed * speedMultiplier * plusOrMinus;
            this.speedX = this.speed;
            this.speedY = speedMultiplier;
            this.alive = true;
            this.leftEdge = 0;
        };
        /*
         * Move the enemy.
         */
        this.draw = function() {
            this.context.clearRect(this.x, this.y, enemy_width, enemy_height);
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x <= this.leftEdge) {
                this.speedX *= -1;
                this.y += this.speedY;
            }
            else if (this.x >= innerWidth - enemy_width) {
                this.speedX *= -1;
                this.y += this.speedY;
            }
            else if (this.y + enemy_height >= innerHeight) {
                lose();
                return true;
            } else {
                // Change to change direction at any point
                if (Math.random() < 0.03) {
                    this.speedX *= -1;
                }
            }
            this.context.drawImage(imageSingleton.enemy, this.x, this.y,
                enemy_width, enemy_height);
        };
        /*
         * Resets the enemy values
         */
        this.reset = function() {
            this.context.clearRect(this.x, this.y, enemy_width, enemy_height);
            this.x = 0;
            this.y = 0;
            this.speed = 0;
            this.speedX = 0;
            this.speedY = 0;
            this.alive = false;
        };
    }
    Enemy.prototype = new Drawing();

    Background.prototype.context = cBack;
    Background.prototype.canvasWidth = backgroundCanvas.width;
    Background.prototype.canvasHeight = backgroundCanvas.height;
    Player.prototype.context = cPlayer;
    Player.prototype.canvasWidth = playerCanvas.width;
    Player.prototype.canvasHeight = playerCanvas.height;
    Laser.prototype.context = cMain;
    Laser.prototype.canvasWidth = mainCanvas.width;
    Laser.prototype.canvasHeight = mainCanvas.height;
    Enemy.prototype.context = cMain;
    Enemy.prototype.canvasWidth = mainCanvas.width;
    Enemy.prototype.canvasHeight = mainCanvas.height;


    function getAccuracy() {
        let acc = Math.round((score/clicks)* 100);
        if (isNaN(acc)) {
            return 100;
        } else {
            return acc;
        }
    }

    function getBest() {
        let bestScore = localStorage.getItem("best");
        if (bestScore == null) {
            return 0;
        }
        return bestScore;
    }
    function updateScoreBoard() {
        document.getElementById("score").innerText = "Score: " + score.toString();
        document.getElementById("accuracy").innerText = "Accuracy: = " + getAccuracy().toString() + "\%";
        document.getElementById("level").innerText = "Level: " + level.toString();
        document.getElementById("best").innerText = "Best Score: " + getBest().toString();
    }

    function gameInit(){
        cPlayer.clearRect(0, 0, innerWidth, innerHeight);
        cMain.clearRect(0, 0, innerWidth, innerHeight);
        cBack.clearRect(0, 0, innerWidth, innerHeight);
        off = false;
        this.background = new Background();
        this.background.init(0,0); // Set draw point to 0,0
        this.player = new Player();
        this.player.init(
            innerWidth / 2 - player_width / 2,
            innerHeight - (player_height + 5),
            player_width,
            player_height);

        this.enemies = new Pool(50, "enemy");
        this.enemies.init();
    }

    function gameKill() {
        off = true;
        this.background = new Background();
        this.player = new Player();
        delete this.enemies;
    }

    gameInit();

    function enemySpawn(timeInterval) {
        if (!off){
            var startX = Math.random() * (innerWidth - enemy_width - 1);
            this.enemies.get(startX + 1, 10, 1.5);
        }
        setTimeout(enemySpawn, timeInterval, spawnMultiplier * 1000);
    }

    setTimeout(enemySpawn, 2000, spawnMultiplier * 1000);

    /**
     * Increasing the level either ups the spawnrate (on even levels)
     * or ups the speed of the enemies (on odd levels).
     */
    function levelUp() {
        level += 1;
        if (level % 2 == 0) {
            spawnMultiplier *= 0.9;
        } else {
            speedMultiplier += 0.2;
        }
    }

    setInterval(levelUp, 15000);

    playerCanvas.addEventListener("mousedown", shootLaser, true);
    function shootLaser(e) {
        player.shoot();
    }

    playerCanvas.addEventListener("mousemove", setMousePosition, false);
    function setMousePosition(e) {
        player.x = e.clientX
            - (player_width / 2) // to get to center of player
            - rect.left; // to account for where the canvas starts
    }

    /*
    What gets done on each drawing loop.
     */
    function loop() {
        requestAnimationFrame(loop);

        if (off) {
            return;
        }

        updateScoreBoard();

        poolCheck(this.player.lasers, this.enemies);

        this.background.draw();

        cPlayer.clearRect(0, 0, playerCanvas.width, playerCanvas.height);
        this.player.checkBounds();
        this.player.draw();
        this.player.lasers.drawAll();
            this.enemies.drawAll();
    }
    loop();
}


window.onload = function() {
    run();
};