var Socket = require('net').Socket;
var tls = require('tls');
var EventEmitter = process.EventEmitter;
var tls = require('tls');
var inherits = require('util').inherits;
var CRLF = '\r\n';

exports = module.exports = Connection;

/**
* Create a new instance of Connection. This instance inherits all functions of the EventEmitter.
* 
* @constructor
* @this {Connection}  
* @param {object} options 
*/
function Connection(options) {
	
	if (!(this instanceof Connection)){
		return new Connection(options);
	}
	
	
	this.prefixCounter = 0;
	this.serverMessages = {};
	this._options = {
		username: options.username || options.user || '',
		password: options.password || '',
		host: options.host || 'localhost',
		port: options.port || 143,
		secure: options.secure === true ? { // secure = true means default behavior
			rejectUnauthorized: false // Force pre-node-0.9.2 behavior
		} : (options.secure || false),
		timeout: options.timeout || 10000, // connection timeout in msecs
		xoauth: options.xoauth,
		xoauth2: options.xoauth2
	};
	
	this._messages = {};
	this._messages = {};
	
	if (options.debug===true){
		this.debug = function(msg){
			console.log(msg);
		}
	}
	
		
	if (options.chainDebug===true){
		this.chainDebug = function(msg){
			console.log(msg);
		}
	}
	
	this.socket = null;
	
	this._messages_prefix_key={};
	this._messages_key_prefix={};
	this._messages={};
	
	
	this._msg_buffer = '';
	this._resetChainCommands();
}


// Inherits from EventEmitter.
Connection.prototype.__proto__ = EventEmitter.prototype;





/**
* Establish a connection to the imap server.
* Emits *connected* on success, *error* on failure.
*
* @this {Connection}  
* @returns {Connection}
*/
Connection.prototype.connect = function() {
	var self = this;
	return self._initConnect();
}

/**
* Internal connection function, see connect()
* @private
* @ignore
* @param {boolean} withinChain
*/
Connection.prototype._initConnect = function(withinChain){
	var self = this;
	
	if ((self._chained===true)&&(withinChain!==true)){
		self._appendChainCommand(function(){
			var self = this;
			self._initConnect(true);
		});
		return self;
	}else{
		
		if (self._options.secure) {
			
			if (self.debug){
				self.debug('[connection] connect');
			}
			var tlsOptions = {};
			for (var k in self._options.secure){
				tlsOptions[k] = self._options.secure[k];
			}
			//tlsOptions.socket = self.socket;
			tlsOptions.port = self._options.port;
			tlsOptions.host = self._options.host;
			var tlssocket = tls.connect(tlsOptions, function(cleartextStream){
				if (typeof cleartextStream!='undefined'){
					self.socket = cleartextStream;
					cleartextStream._parent = self;
					cleartextStream.on('secureConnect', function(err) {
						var self = this._parent;
						self.emit('connected', err );
					});
					self._messages_prefix_key['CON']='CON';
					self._messages_key_prefix['CON']='CON';
					self._messages['CON']='';
					cleartextStream.on('data', self._onData);
				}else{
					self.emit('error',self, new Error('could not establish a secure connection'));
				}
			});
		}else{
			 
			self._connect();
		}
	}
	return self;
}

/**
* Internal connection function for unsecured connections, see connect()
* @private
* @ignore
*/
Connection.prototype._connect = function(){
	var self = this;
	self.socket = new Socket();
	self.socket.setKeepAlive(true);
	self.socket.setTimeout(self._options.timeout); // sending timeout
		
	
	if (self.debug){
		self.debug('[connection] connect');
	}
	
	self.socket.on('connect', function(err) {
		var self = this._parent;
		self.emit('connected', err );
	});
	
	self.socket.on('error', function(err) {
		var self = this._parent;
		self.emit('error', err );
	});
	
	self.socket._parent = self;
	self.socket.on('data', self._onData);
	
	self._messages_prefix_key['CON']='CON';
	self._messages_key_prefix['CON']='CON';
	self._messages['CON']='';
	self.socket.connect(self._options.port, self._options.host);
}

/**
* Helper function for any data received on the socket.
* @private
*/
Connection.prototype._onData = function(data){
	var self = this._parent;
	self._msg_buffer += data.toString();
	
	if (self.debug){
		self.debug('[connection] incoming data.');
		self.debug(dataString);
		self.debug('[connection] incoming data done.');
	}
	self._parseData(self._msg_buffer);
}

/**
* Helper function for parsing any data received on the socket.
* @private
* @param {string} the hole message
*/
Connection.prototype._parseData = function(dataString){
	var self = this;
	
	var lines=dataString.split(CRLF);
	 
	if (lines.length>=2){
		var lastLine = lines.pop();
		var stateLine = lines.pop();
		var responseParts = stateLine.split(' ');
		var prefix = responseParts.shift();
		var state = responseParts.shift();
		if (prefix==='*'){
			prefix='CON';
		}
		
		var key = self._messages_prefix_key[prefix];
		self._messages[prefix]=lines.join(CRLF);
		
		if (state==='OK'){
			self._msg_buffer='';
			self.emit(key,self,prefix,lines.join(CRLF),responseParts.join(' '));
			if (self._chained===true){
				self.execute();
			}
		}else if (state==='NO'){
			self._msg_buffer='';
			self.emit('imap error',self,key,lines.join(CRLF),responseParts.join(' '));
			if (self._chained===true){
				self.emit('error chained',self,key,lines.join(CRLF),responseParts.join(' '));
				self.socket.end();
			}
		}else{
			
		}
	}
}

/**
* Returns the message for the specified key
* @this {Connection}  
* @param {string} key
* @returns {string} th message for the key or undefined if the key does not exists
*/
Connection.prototype.get = function(key){
	var self = this;
	var prefix = self._messages_key_prefix[key];
	return self._messages[prefix];
}

/**
* Initiate chained commands, they will be exceuted only if execute will be called.
* When it's called it will reset the chain. All commands followed will be chained and 
* exceuted when execute. If an error occoured the chain stop at that point and 
* emits the *error chained* event.
* @this {Connection} 
* @returns {Connection}
*/
Connection.prototype.chained = function(){
	var self = this;
	self._resetChainCommands();
	self._chained=true;
	return self;
}

/**
* Execute chained commands. If an error occoured the chain stop at that point and 
* emits the *error chained*. The chained *chained* will be emmited when all commands was executed successfully
* @this {Connection}  
* @returns {Connection}
*/
Connection.prototype.execute = function(){
	var self = this;
	self._executeNextCommand();
	return self;
}

/**
* Sends the login to the Server.
* Emits *LOGIN* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.login = function(key){
	var self = this;
	
	var cmd = 'LOGIN "'+this._options.username+'" "'+this._options.password+'" ';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'LOGIN':key);
	}else{
		self._send(cmd,(!key)?'LOGIN':key);
	}
	return self;
}

/**
* Sends the capability-command to the Server.
* Emits *CAPABILITY* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.capability = function(key){
	var self = this;
	
	var cmd='CAPABILITY';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?cmd:key);
	}else{
		self._send(cmd,(!key)?cmd:key);
	}
	return self;
}

/**
* Sends the select-command to the Server.
* Emits *SELECT* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {box} the name of the box to be selected
* @param {key} optional the key name for storing the result
* @return {Connection}
**/
Connection.prototype.select = function(box,key){
	var self = this;
	if (!box) throw new Error('A box must be given');
	
	var cmd='SELECT '+box;
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'SELECT':key);
	}else{
		if (self.debug){
			self.debug('[connection] '+cmd);
		}
		self._send(cmd,(!key)?'SELECT':key);
	}
	return self;
}

/**
* Fetches the message with the given number.
* Emits *FETCH* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {number} the number of message
* @param {string} the item of message  {@link http://www.faqs.org/rfcs/rfc3501.html} (section 6.4.5)
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.fetch=function(number,item,key){
	var self = this;
	if (!number) throw new Error('A number must be given');
	
	var cmd='FETCH '+number+' '+item;
	console.log(cmd);
	
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'FETCH':key);
	}else{
		if (self.debug){
			self.debug('[connection] '+cmd);
		}
		self._send(cmd,(!key)?'FETCH':key);
	}
	return self;
}


/**
* Fetches the message with the given number.
* Emits *FETCH* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {number} the number of message
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.fetchMessage = function(number,key){
	var self = this;
	if (!number) throw new Error('A number must be given');
	
	var cmd='FETCH '+number+' FULL';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'FETCH':key);
	}else{
		if (self.debug){
			self.debug('[connection] '+cmd);
		}
		self._send(cmd,(!key)?'FETCH':key);
	}
	return self;
}

/**
* Fetches the message header with the given number.
* Emits *BODYHEADER* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {number} the number of message
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.fetchHeader = function(number,key){
	var self = this;
	if (!number) throw new Error('A number must be given');
	
	var cmd='FETCH '+number+' BODY[HEADER]';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'BODYHEADER':key);
	}else{
		if (self.debug){
			self.debug('[connection] '+cmd);
		}
		self._send(cmd,(!key)?'BODYHEADER':key);
	}
	return self;
}

/**
* Fetches the message text with the given number.
* Emits *BODYTEXT* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {number} the number of message
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.fetchBody = function(number,key){
	var self = this;
	if (!number) throw new Error('A number must be given');
	
	var cmd='FETCH '+number+' BODY[TEXT]';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?'BODYTEXT':key);
	}else{
		if (self.debug){
			self.debug('[connection] '+cmd);
		}
		self._send(cmd,(!key)?'BODYTEXT':key);
	}
	return self;
}

/**
* Send the logout command.
* Emits *LOGOUT* (or the key name) on success and *imap error* on failure
* @this {Connection} 
* @param {key} optional the key name for storing the result
* @return {Connection}
*/
Connection.prototype.logout = function(key){
	var self = this;
	var cmd = 'LOGOUT';
	if (self._chained===true){
		self._appendChainCommand(cmd,(!key)?cmd:key);
	}else{
		if (self.debug){
			self.debug('[connection] try to logout');
		}
		self._send(cmd,(!key)?cmd:key);
	}
	return self;
}








// ################### internal functions ##########################


/**
* Internal helper for sending commands to the server.
* This method set the prefix counter for each command.
* @this {Connection} 
* @private
*/
Connection.prototype._send = function(cmdstr, key) {
	var self = this;
	if (!self.socket.writable){
		return;
	}
	if (self.debug){
		self.debug('[connection] send: '+cmdstr);
	}
	
	
	
	var prefix = 'A' + (++this.prefixCounter);
	
	self._messages_key_prefix[key]=prefix;
	self._messages_prefix_key[prefix]=key;
	self._messages[prefix] = '';
	
	self.socket.write(prefix+' '+cmdstr+CRLF);
}

/**
* Internal helper for cleaning/ initialization of the command-chain.
* @this {Connection} 
* @private
*/
Connection.prototype._resetChainCommands=function(){
	this._chained=false;
	this.chainedCommands=[];
	this.chainedIndex=-1;
}

/**
* Internal helper for appending a command to the chain.
* @this {Connection} 
* @private
* @param {mixed} command
*/
Connection.prototype._appendChainCommand=function(cmd,key){
	var self = this;
	if (self.debug){
		if (typeof cmd=='string'){
			self.debug('[chain] append '+cmd);
		}else{
			self.debug('[chain] append a function');
		}
	}
	self.chainedCommands.push({cmd: cmd,key:key});
	self.chainedIndex++;
}

/**
* Internal helper for executing the command-chain.
* @this {Connection} 
* @private
*/
Connection.prototype._executeNextCommand=function(){
	var self = this;
	if (self.chainedCommands.length>0){
		var cmdObj = self.chainedCommands.shift();
		this.chainedIndex--;
		if (typeof cmdObj.cmd=='string'){
			if (self.chainDebug){
				self.chainDebug('[chain] send '+cmdObj.cmd);
			}
			self._send(cmdObj.cmd,cmdObj.key);
		}else if(typeof cmdObj.cmd=='function'){
			if (self.chainDebug){
				self.chainDebug('[chain] execute function');
			}
			cmdObj.cmd.apply(self);
		}
	}else if (self.chainedCommands.length==0){
		if (self.chainDebug){
				self.chainDebug('[chain] execution ends');
		}
		self.emit('chained',self)
	}
	
}