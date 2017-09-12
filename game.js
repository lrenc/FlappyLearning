(function() {
	var timeouts = [];
	var messageName = "zero-timeout-message";

	function setZeroTimeout(fn) {
		timeouts.push(fn);
		window.postMessage(messageName, "*");
	}

	function handleMessage(event) {
		// console.log(112)
		if (event.source == window && event.data == messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				var fn = timeouts.shift();
				fn();
			}
		}
	}

	window.addEventListener("message", handleMessage, true);

	window.setZeroTimeout = setZeroTimeout;
})();

var Neuvol;
var game;
var FPS = 60;
var maxScore=0;

var images = {};

var speed = function(fps){
	FPS = parseInt(fps);
}

var loadImages = function(sources, callback){
	var nb = 0;
	var loaded = 0;
	var imgs = {};
	for(var i in sources){
		nb++;
		imgs[i] = new Image();
		imgs[i].src = sources[i];
		imgs[i].onload = function(){
			loaded++;
			if(loaded == nb){
				// 所有图片加载完成之后
				callback(imgs);
			}
		}
	}
}

// 鸟类
var Bird = function(json){
	this.x = 80;
	this.y = 250;
	this.width = 40;
	this.height = 30;

	this.alive = true;
	// 地心引力
	this.gravity = 0;
	// 速度
	this.velocity = 0.3;
	this.jump = -6;

	this.init(json);
}

Bird.prototype.init = function(json){
	// 把json的属性都赋值给this
	for(var i in json){
		this[i] = json[i];
	}
}

// flap 就是跳一下
Bird.prototype.flap = function(){
	// 地心引力 = jump ?
	// console.log(11)
	this.gravity = this.jump;
}

// 更新，鸟的位置，鸟的x轴是不会变的
Bird.prototype.update = function(){
	this.gravity += this.velocity;
	// console.log(this.gravity);
	this.y += this.gravity;
}

// 判断鸟是否死亡
Bird.prototype.isDead = function(height, pipes) {
	// 掉到了地上
	// this.y + this.height <= 0是啥
	if(this.y >= height || this.y + this.height <= 0){
		return true;
	}
	// 遍历管子
	for(var i in pipes){
		if(!(
			this.x > pipes[i].x + pipes[i].width ||
			this.x + this.width < pipes[i].x ||
			this.y > pipes[i].y + pipes[i].height ||
			this.y + this.height < pipes[i].y
			)){
			return true;
		}
	}
}

// 管子类
var Pipe = function(json) {
	this.x = 0;
	this.y = 0;
	this.width = 50;
	this.height = 40;
	this.speed = 3;

	this.init(json);
}

Pipe.prototype.init = function(json){
	for(var i in json){
		this[i] = json[i];
	}
}

// 管子的更新
Pipe.prototype.update = function(){
	this.x -= this.speed;
}

// 判断管子是否已经出去了
Pipe.prototype.isOut = function(){
	if(this.x + this.width < 0){
		return true;
	}
}

// 游戏类
var Game = function(){
	this.pipes = [];
	this.birds = [];
	this.score = 0;
	this.canvas = document.querySelector("#flappy");
	this.ctx = this.canvas.getContext("2d");
	this.width = this.canvas.width;
	this.height = this.canvas.height;
	this.spawnInterval = 90;
	this.interval = 0;
	this.gen = [];
	// 活着的鸟的个数
	this.alives = 0;
	// 局数（代数）
	this.generation = 0;
	// 背景的移动速度
	this.backgroundSpeed = 0.5;
	// 背景的x轴位置
	this.backgroundx = 0;
	this.maxScore = 0;
}

// 开始游戏
Game.prototype.start = function(){
	this.interval = 0;
	this.score = 0;
	this.pipes = [];
	this.birds = [];
	// 神经网络
	// 产生下一代
	// 给每一只鸟生成一个神经网络
	this.gen = Neuvol.nextGeneration();

	for(var i in this.gen) {
		// 一开始初始化了50只鸟
		var b = new Bird();
		this.birds.push(b);
	}
	// 局数+1
	this.generation ++;
	// 50只全活着
	this.alives = this.birds.length;
}

// 更新游戏
Game.prototype.update = function() {
	// 移动背景
	this.backgroundx += this.backgroundSpeed;
	// to do
	// 这个nextHoll是什么呢
	var nextHoll = 0;
	// 鸟的横向飞行速度是一样的
	if(this.birds.length > 0) {
		for(var i = 0; i < this.pipes.length; i+= 2) {
			// 基本都是0，很偶然是2
			let pipe = this.pipes[i];
			let bird = this.birds[0];
			// bird 没有完全通过当前pipe
			// 还没有通过的pipe
			// console.log(pipe.x, pipe.width, bird.x);
			if(pipe.x + pipe.width > bird.x) {
				// 0.537109375
				// console.log(pipe.height, this.height);
				nextHoll = pipe.height / this.height;
				// console.log(nextHoll)
				break;
			}
		}
	}
	// 遍历所有鸟
	for(var i in this.birds) {
		// 如果当前鸟还活着
		// 有正有负数
		// console.log(this.birds[i].y)
		if(this.birds[i].alive) {
			var inputs = [
				this.birds[i].y / this.height,
				nextHoll
			];
			// 如果当前鸟还活着，就进行一次神秘的计算
			var res = this.gen[i].compute(inputs);
			// console.log(res);
			//
			if(res[0] > 0.5) {
				this.birds[i].flap();
			}
			// 移动当前鸟
			this.birds[i].update();
			if(this.birds[i].isDead(this.height, this.pipes)) {
				this.birds[i].alive = false;
				this.alives --;
				//console.log(this.alives);
				Neuvol.networkScore(this.gen[i], this.score);
				// 如果游戏结束，立马重启
				if(this.isItEnd()){
					this.start();
				}
			}
		}
	}
	// 移动水管
	for(var i = 0; i < this.pipes.length; i++) {
		this.pipes[i].update();
		// 移除出去的水管
		if(this.pipes[i].isOut()) {
			this.pipes.splice(i, 1);
			i--;
		}
	}
	// 什么时候需要插入新的水管
	if(this.interval == 0) {
		var deltaBord = 50;
		// pipeHoll是两个管子之间的空隙
		var pipeHoll = 120;

		var hollPosition = Math.round(Math.random() * (this.height - deltaBord * 2 - pipeHoll)) +  deltaBord;
		// 水管从右边出现
		// 一次性推入两个水管（一对）
		this.pipes.push(new Pipe({
			x: this.width,
			y: 0,
			height:hollPosition
		}));

		this.pipes.push(new Pipe({
			x: this.width,
			y: hollPosition + pipeHoll,
			height: this.height
		}));
	}

	this.interval++;
	// console.log(this.interval);
	if(this.interval == this.spawnInterval){
		this.interval = 0;
	}

	this.score++;
	this.maxScore = (this.score > this.maxScore) ? this.score : this.maxScore;
	var self = this;
	// console.log(FPS);
	// FPS表示 *1 *2 *3 更新的速率
	if(FPS == 0) {
		setZeroTimeout(function(){
			self.update();
		});
	}else{
		// console.log(1000/FPS);
		setTimeout(function() {
			self.update();
		}, 1000/FPS);
	}
}

// 只要有一只鸟活着，就没有结束
Game.prototype.isItEnd = function(){
	for(var i in this.birds){
		if(this.birds[i].alive){
			return false;
		}
	}
	return true;
}
// 绘图
Game.prototype.display = function() {
	// 清除画布
	// console.log(images.background.width);
	this.ctx.clearRect(0, 0, this.width, this.height);
	// x 轴平铺背景图片
	// console.log(this.width / images.background.width)
	for(var i = 0; i < Math.ceil(this.width / images.background.width) + 1; i++){
		// console.log(i) 0,1,2
		this.ctx.drawImage(images.background, i * images.background.width - Math.floor(this.backgroundx%images.background.width), 0)
	}
	// console.log(this.pipes);
	for(var i in this.pipes) {
		// 管子是成对出现的
		if(i%2 == 0) {
			this.ctx.drawImage(images.pipetop, this.pipes[i].x, this.pipes[i].y + this.pipes[i].height - images.pipetop.height, this.pipes[i].width, images.pipetop.height);
		}else{
			this.ctx.drawImage(images.pipebottom, this.pipes[i].x, this.pipes[i].y, this.pipes[i].width, images.pipetop.height);
		}
	}
	// 画鸟
	this.ctx.fillStyle = "#FFC600";
	this.ctx.strokeStyle = "#CE9E00";
	for(var i in this.birds){
		if(this.birds[i].alive){
			this.ctx.save();
			// 调整 0 0 的位置为鸟的中心点
			this.ctx.translate(this.birds[i].x + this.birds[i].width/2, this.birds[i].y + this.birds[i].height/2);
			// 旋转鸟
			this.ctx.rotate(Math.PI/2 * this.birds[i].gravity/20);
			// 画鸟
			this.ctx.drawImage(images.bird, -this.birds[i].width/2, -this.birds[i].height/2, this.birds[i].width, this.birds[i].height);
			// 恢复
			this.ctx.restore();
		}
	}
	// 画文字
	this.ctx.fillStyle = "white";
	this.ctx.font="20px Oswald, sans-serif";
	this.ctx.fillText("Score : "+ this.score, 10, 25);
	this.ctx.fillText("Max Score : "+this.maxScore, 10, 50);
	this.ctx.fillText("Generation : "+this.generation, 10, 75);
	this.ctx.fillText("Alive : "+this.alives+" / "+Neuvol.options.population, 10, 100);

	var self = this;
	// 绘图是完全独立的
	requestAnimationFrame(function(){
		self.display();
	});
}

window.onload = function() {
	var sprites = {
		bird:"./img/bird.png",
		background:"./img/background.png",
		pipetop:"./img/pipetop.png",
		pipebottom:"./img/pipebottom.png"
	};

	var start = function() {
		Neuvol = new Neuroevolution({
			population:50,
			// 这个network是用来定义深度学习网络结构的
			network:[2, [2], 1],
		});
		game = new Game();
		game.start();
		game.update();
		game.display();
	}


	loadImages(sprites, function(imgs){
		images = imgs;
		start();
	})

}
