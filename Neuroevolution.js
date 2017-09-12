/**
 * Provides a set of classes and methods for handling Neuroevolution and
 * genetic algorithms.
 *
 * @param {options} An object of options for Neuroevolution.
 */

// 神经进化
var Neuroevolution = function(options) {
	var self = this;  // reference to the top scope of this module

 	// Declaration of module parameters (options) and default values
	self.options = {
    	/**
     	 * Logistic activation function.
     	 *
		 * @param {a} Input value.
		 * @return Logistic function output.
		 */
		// 激活函数
		// 这里默认的激活函数是Sigmoid函数
		activation: function(a) {
			ap = (-a)/1;
			// 这个激活函数把x映射到了(0, 1)之间，x > 0 y > 0.5, x < 0, y < 0.5
			// exp() 方法可返回 e 的 x 次幂的值。e 代表自然对数的底数，其值近似为 2.71828
			return (1/(1 + Math.exp(ap)))
		},

		/**
		 * Returns a random value between -1 and 1.
		 *
		 * @return Random value.
		 */
		randomClamped: function() {
			return Math.random() * 2 - 1;
		},

		// various factors and parameters (along with default values).
		network:[1, [1], 1],    // Perceptron network structure (1 hidden
					// layer).
		population: 50,          // Population by generation.
		// 精英主义
		elitism:0.2,            // Best networks kepts unchanged for the next
				        // generation (rate).
		randomBehaviour:0.2,    // New random networks for the next generation
				        // (rate).
		mutationRate:0.1,       // Mutation rate on the weights of synapses.
		mutationRange:0.5,      // Interval of the mutation changes on the
				        // synapse weight.
		historic:0,             // Latest generations saved.
		lowHistoric:false,      // Only save score (not the network).
		scoreSort:-1,           // Sort order (-1 = desc, 1 = asc).
		nbChild: 1               // Number of children by breeding.
	};

	/**
	 * Override default options.
	 *
	 * @param {options} An object of Neuroevolution options.
	 * @return void
	 */
	// 把值设置到自身options属性上
	self.set = function(options) {
		for(var i in options) {
  			if(this.options[i] != undefined) { // Only override if the passed in value
                    	                  	  // is actually defined.
				self.options[i] = options[i];
			}
		}
	}

	// Overriding default options with the pass in options
	self.set(options);


/*NEURON**********************************************************************/
	/**
	 * Artificial Neuron class
	 *
	 * @constructor
	 */
	// 神经元
	var Neuron = function() {
		this.value = 0;
		this.weights = [];
	}

	/**
	 * Initialize number of neuron weights to random clamped values.
	 *
	 * @param {nb} Number of neuron weights (number of inputs).
	 * @return void
	 */
	// weights里填充的是nb个 -1 到 1的数
	Neuron.prototype.populate = function(nb) {
		this.weights = [];
		for(var i = 0; i < nb; i++) {
			this.weights.push(self.options.randomClamped());
		}
	}


/*LAYER***********************************************************************/
	/**
	 * Neural Network Layer class.
	 *
	 * @constructor
	 * @param {index} Index of this Layer in the Network.
	 */
	var Layer = function(index) {
		this.id = index || 0;
		this.neurons = [];
	}

	/**
	 * Populate the Layer with a set of randomly weighted Neurons.
	 *
	 * Each Neuron be initialied with nbInputs inputs with a random clamped
	 * value.
	 *
	 * @param {nbNeurons} Number of neurons.
	 * @param {nbInputs} Number of inputs.
	 * @return void
	 */
	// 神经网络的层
	// 声明nbNeurons个神经元
	Layer.prototype.populate = function(nbNeurons, nbInputs) {
		this.neurons = [];
		for(var i = 0; i < nbNeurons; i++) {
			var n = new Neuron();
			n.populate(nbInputs);
			this.neurons.push(n);
		}
	}


/*NEURAL NETWORK**************************************************************/
	/**
	 * Neural Network class
	 *
	 * Composed of Neuron Layers.
	 *
	 * @constructor
	 */
	// 网络包含多个layer
	var Network = function(){
		this.layers = [];
	}

	/**
	 * Generate the Network layers.
	 * 生成网络层
	 *
	 * @param {input} Number of Neurons in Input layer.
	 * @param {hidden} Number of Neurons per Hidden layer.
	 * @param {output} Number of Neurons in Output layer.
	 * @return void
	 */
	// 这个函数执行下来会产生什么效果
	// 会形成多个layer
	// 第一个layer的长度是 input
	//2, [2], 1
	// 输入层是一个包含两个神经元，每个神经元的weight长度都是0
	Network.prototype.perceptronGeneration = function(input, hiddens, output) {
		var index = 0;
		var previousNeurons = 0;
		var layer = new Layer(index);
		// 注意每个layer的长度
    	layer.populate(input, previousNeurons); // Number of Inputs will be set to
                	                            // 0 since it is an input layer.
		previousNeurons = input; // number of input is size of previous layer.
		// previousNeurons = 2;
		this.layers.push(layer);
		index ++;
		// index = 1
		// hiddens = [2];
		for (var i in hiddens) {
			// Repeat same process as first layer for each hidden layer.
			// index就是一个id
			var layer = new Layer(index);
			// layer.populate(2, 2);
			layer.populate(hiddens[i], previousNeurons);
			previousNeurons = hiddens[i];
			this.layers.push(layer);
			index++;
		}
		var layer = new Layer(index);
		// layer.populate(1, 2)
		layer.populate(output, previousNeurons);  // Number of input is equal to
                        	                      // the size of the last hidden
							  			  		  // layer.
		this.layers.push(layer);
	}

	/**
	 * Create a copy of the Network (neurons and weights).
	 *
	 * Returns number of neurons per layer and a flat array of all weights.
	 *
	 * @return Network data.
	 */
	Network.prototype.getSave = function() {
		var datas = {
			neurons:[], // Number of Neurons per layer.
			weights:[]  // Weights of each Neuron's inputs.
		};
		// i依然是key
		for(var i in this.layers) {
			datas.neurons.push(this.layers[i].neurons.length);
			for(var j in this.layers[i].neurons) {
				for(var k in this.layers[i].neurons[j].weights) {
	  				// push all input weights of each Neuron of each Layer into a flat
	  				// array.
					datas.weights.push(this.layers[i].neurons[j].weights[k]);
				}
			}
		}
		return datas;
	}

	/**
	 * Apply network data (neurons and weights).
	 *
	 * @param {save} Copy of network data (neurons and weights).
	 * @return void
	 */
	// 重新赋值
	Network.prototype.setSave = function(save) {
		// 给this.layers重新赋值
		var previousNeurons = 0;
		var index = 0;
		var indexWeights = 0;
		this.layers = [];
		for(var i in save.neurons) {
			// Create and populate layers.
			var layer = new Layer(index);
			layer.populate(save.neurons[i], previousNeurons);
			for(var j in layer.neurons){
				for(var k in layer.neurons[j].weights){
	  				// Apply neurons weights to each Neuron.
					layer.neurons[j].weights[k] = save.weights[indexWeights];

					indexWeights++; // Increment index of flat array.
				}
			}
			previousNeurons = save.neurons[i];
			index++;
			this.layers.push(layer);
		}
	}

	/**
	 * Compute the output of an input.
	 *
	 * @param {inputs} Set of inputs.
	 * @return Network output.
	 */
	// 计算当前神经元的 value
	Network.prototype.compute = function(inputs) {
		// Set the value of each Neuron in the input layer.
		// inputs的长度固定为2，分别是两个高度的占比
		// 给输入层的两个神经元的value赋值
		for(var i in inputs) {
			if(this.layers[0] &&
			   this.layers[0].neurons[i]) {
			   this.layers[0].neurons[i].value = inputs[i];
			}
		}
		// 输入层
		var prevLayer = this.layers[0]; // Previous layer is input layer.
		// hidden layers
		for(var i = 1; i < this.layers.length; i++) {
			for(var j in this.layers[i].neurons) {
				// For each Neuron in each layer.
				// 遍历每一个hidden 层的每一神经元
				// 对这里的每一个神经元都做一个操作，什么操作呢
				var sum = 0;
				for(var k in prevLayer.neurons) {
					// 遍历输入层的每一个神经元
	  				// Every Neuron in the previous layer is an input to each Neuron in
	  				// the next layer.
					// 这里是为什么呢
					sum += prevLayer.neurons[k].value * this.layers[i].neurons[j].weights[k];
					// sum += this.layers[i].neurons[j].weights[k];
				}
				// Compute the activation of the Neuron.
				// 使用激活函数计算
				// 这个数据结构太神奇了
				// this.layers[i].neurons[j].value = self.options.randomClamped();
				this.layers[i].neurons[j].value = self.options.activation(sum);
			}
			// 修改输入层
			prevLayer = this.layers[i];
		}

		// All outputs of the Network.
		var out = [];
		var lastLayer = this.layers[this.layers.length - 1];
		for(var i in lastLayer.neurons) {
			out.push(lastLayer.neurons[i].value);
		}
		// out是输出层中所有神经元的value数组
		// console.log(out)
		return out;
	}


/*GENOME**********************************************************************/
	/**
	 * Genome class.
	 *
	 * Composed of a score and a Neural Network.
	 *
	 * @constructor
	 *
	 * @param {score}
	 * @param {network}
	 */

	// 基因组
	var Genome = function(score, network) {
		this.score = score || 0;
		this.network = network || null;
	}


/*GENERATION******************************************************************/
	/**
	 * Generation class.
	 *
	 * Composed of a set of Genomes.
	 *
	 * @constructor
	 */
	// 生产
	var Generation = function() {
		this.genomes = [];
	}

	/**
	 * Add a genome to the generation.
	 *
	 * @param {genome} Genome to add.
	 * @return void.
	 */
	// 假设鸟都会死掉，按死掉的顺序排序，目的是为了选出活的最久的鸟的基因
	Generation.prototype.addGenome = function(genome) {
    	// Locate position to insert Genome into.
    	// The gnomes should remain sorted.
		for(var i = 0; i < this.genomes.length; i++) {
      		// Sort in descending order.
			// 这里是 -1
			// score大的排在前面
			if(self.options.scoreSort < 0) {
				if(genome.score > this.genomes[i].score) {
					break;
				}
			// Sort in ascending order.
			} else {
				if (genome.score < this.genomes[i].score) {
					break;
				}
			}
		}
		// Insert genome into correct position.
		this.genomes.splice(i, 0, genome);
	};

	/**
	 * Breed to genomes to produce offspring(s).
	 *
	 * @param {g1} Genome 1.
	 * @param {g2} Genome 2.
	 * @param {nbChilds} Number of offspring (children).
	 */
	// 产生下一代
	// nbChilds 为需要产生的后代个数
	Generation.prototype.breed = function(g1, g2, nbChilds) {
		var datas = [];
		for(var nb = 0; nb < nbChilds; nb++) {
			// Deep clone of genome 1.
			// 放在循环里就是为了深拷贝
			var data = JSON.parse(JSON.stringify(g1));
			// 随机替换
			for(var i in g2.network.weights) {
				// Genetic crossover
				// 0.5 is the crossover factor.
				// FIXME Really should be a predefined constant.
				if(Math.random() <= 0.5) {
					data.network.weights[i] = g2.network.weights[i];
				}
			}
			// Perform mutation on some weights.
			// 对一些基因进行突变，这里突变的概率是不是太大了一点
			for(var i in data.network.weights) {
				if(Math.random() <= self.options.mutationRate) {
					// 突变的范围是[-0.5, 0.5]
					data.network.weights[i] += Math.random()
						* self.options.mutationRange * 2
				   		- self.options.mutationRange;
				}
			}
			datas.push(data);
		}

		return datas;
	}

	/**
	 * Generate the next generation.
	 *
	 * @return Next generation data array.
	 */
	Generation.prototype.generateNextGeneration = function() {
		var nexts = [];
		// elitism 精英 0.2
		// population 人口数量 50
		// Math.round 四舍五入
		// console.log(Math.round(self.options.elitism * self.options.population));
		for(var i = 0; i < Math.round(self.options.elitism * self.options.population); i++) {
			if(nexts.length < self.options.population) {
        		// Push a deep copy of ith Genome's Nethwork.
				// 取出排名前10的基于序列
				nexts.push(JSON.parse(JSON.stringify(this.genomes[i].network)));
			}
		}
		// randomBehaviour 0.2
		// population 人口数量
		// 这段代码的用意是什么呢，又产生了10个新的基因
		for(var i = 0; i < Math.round(self.options.randomBehaviour * self.options.population); i++) {
			// 每一次都取第一个基因
			var n = JSON.parse(JSON.stringify(this.genomes[0].network));
			// 但是value没有重新计算
			for(var k in n.weights) {
				// 重新计算基因
				n.weights[k] = self.options.randomClamped();
			}
			if(nexts.length < self.options.population){
				nexts.push(n);
			}
		}

		var max = 0;
		// 这种繁殖行为很是奇怪
		// 保证后代的个数依然是50个
		while(true) {
			for(var i = 0; i < max; i++) {
        		// Create the children and push them to the nexts array.
        		var childs = this.breed(this.genomes[i], this.genomes[max], (self.options.nbChild > 0 ? self.options.nbChild : 1) );
				for (var c in childs) {
					nexts.push(childs[c].network);
					if(nexts.length >= self.options.population){
						// Return once number of children is equal to the
						// population by generatino value.
						return nexts;
					}
				}
			}
			max++;
			if(max >= this.genomes.length - 1){
				max = 0;
			}
		}
	}


/*GENERATIONS*****************************************************************/
	/**
	 * Generations class.
	 *
	 * Hold's previous Generations and current Generation.
	 *
	 * @constructor
	 */
	//  就声明了一个数组
	var Generations = function() {
		this.generations = [];
		// var currentGeneration = new Generation();
	}

	/**
	 * Create the first generation.
	 *
	 * @param {input} Input layer.
	 * @param {input} Hidden layer(s).
	 * @param {output} Output layer.
	 * @return First Generation.
	 */
	// 创建一个 generation
	Generations.prototype.firstGeneration = function() {
    	// FIXME input, hiddens, output unused.
		var out = [];
		// 这个population的作用是什么
		// population表示人口数量 50
		// 一只鸟一个深度学习系统？
		for(var i = 0; i < self.options.population; i++) {
      		// Generate the Network and save it.
			// 申明population个Network
			var nn = new Network(); // nn.layers = [];
			// 2, [2], 1
			// 函数最终运行起来的堆栈结构到底是什么样子的
			nn.perceptronGeneration(
				self.options.network[0],
				self.options.network[1],
				self.options.network[2]
			);
			// {neurons: [Number], weights: [Array[Number]]}
			out.push(nn.getSave());
		}
		// out的长度是50
		this.generations.push(new Generation());
		return out;
	}

	/**
	 * Create the next Generation.
	 *
	 * @return Next Generation.
	 */
	Generations.prototype.nextGeneration = function() {
		if(this.generations.length == 0) {
			// Need to create first generation.
			return false;
		}
		// 繁殖下一代
		var gen = this.generations[this.generations.length - 1].generateNextGeneration();
		// 这个地方又push了一个generations
		this.generations.push(new Generation());
		return gen;
	}

	/**
	 * Add a genome to the Generations.
	 *
	 * @param {genome}
	 * @return False if no Generations to add to.
	 */
	// add的是被淘汰掉的基因？
	Generations.prototype.addGenome = function(genome) {
    		// Can't add to a Generation if there are no Generations.
		if(this.generations.length == 0) return false;

   		 // FIXME addGenome returns void.
		return this.generations[this.generations.length - 1].addGenome(genome);
	}


/*SELF************************************************************************/
	// 注意这里
	self.generations = new Generations();

	/**
	 * Reset and create a new Generations object.
	 *
	 * @return void.
	 */
	self.restart = function() {
		self.generations = new Generations();
	}

	/**
	 * Create the next generation.
	 *
	 * @return Neural Network array for next Generation.
	 */
	// 游戏开始之后运行这个函数
	self.nextGeneration = function() {
		var networks = [];
		// console.log(self.generations.generations.length);
		if(self.generations.generations.length == 0) {
      		// If no Generations, create first.
			// 对于first来说的话，这里的networks是所有鸟的神经网络数组
			networks = self.generations.firstGeneration();
		} else {
      		// Otherwise, create next one.
			// 生成下一代基于组
			networks = self.generations.nextGeneration();
		}

    	// Create Networks from the current Generation.
		var nns = [];
		// 对每一只鸟，又重新恢复数据结构
		for(var i in networks) {
			// 对于firstGenerationnetworks是out
			var nn = new Network();
			nn.setSave(networks[i]);
			nns.push(nn);
		}

		if(self.options.lowHistoric) {
			// Remove old Networks.
			if(self.generations.generations.length >= 2){
				var genomes =
					self.generations
						.generations[self.generations.generations.length - 2]
              					.genomes;
				for(var i in genomes){
					delete genomes[i].network;
				}
			}
		}
		// 有历史意义的
		// 0
		if(self.options.historic != -1) {
      		// Remove older generations.
			// 表示产生的代数
			if(self.generations.generations.length > self.options.historic + 1) {
				// 从数组中删除一些元素
				// 把先人全干掉
        		self.generations.generations.splice(0, self.generations.generations.length - (self.options.historic + 1));
			}
		}
		// 这个nns是恢复了network数据结构的鸟数组
		return nns;
	}

	/**
	 * Adds a new Genome with specified Neural Network and score.
	 *
	 * @param {network} Neural Network.
	 * @param {score} Score value.
	 * @return void.
	 */
	// 当前鸟死了之后调用这个方法
	self.networkScore = function(network, score) {
		// network表示当前鸟的神经网络
		// score可以认为是这只鸟存活的时间
		self.generations.addGenome(new Genome(score, network.getSave()));
	}
}
