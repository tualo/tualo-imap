var CRLF = '\r\n';
exports = module.exports = Message;

/**
* Create a new instance of Message. 
* 
* -rawText of the message recieved from th IMAP server.
* 
* @constructor
* @this {Message}  
* @param {string} rawText 
*/
function Message(rawText){
	this.rawText = rawText;
	this._parsed = false;
	this._isFetch = false;
	this._list = [];
	this._search = [];
	this._fetch = {
		text: ''
	};
	
	this._parse();
}

/**
* Returns the raw message text.
* 
* @this {Message} 
*/
Message.prototype.toString = function(){
	return this.rawText;
}

/**
* Return all parsed list entries.
* 
* @this {Message} 
*/
Message.prototype.getList = function(){
	return this._list;
}

/**
* Return all parsed search numbers.
* 
* @this {Message} 
*/
Message.prototype.getSearchList = function(){
	return this._search;
}

/**
* Return the parsed Fetch-Object.
* 
* @this {Message} 
*/
Message.prototype.getFetched = function(){
	 
	return this._fetch;
}

/**
* Parses the message.
* 
* @this {Message} 
*/
Message.prototype._parse = function(){
	var lines = this.rawText.split(CRLF);
	for (var i in lines){
		this._parseLine(lines[i]);
	}
}
Message.prototype._parseLine = function(line){
	if (this._isFetch===true){
		if (this._fetch.text!==''){
			this._fetch.text+=CRLF;
		}
		this._fetch.text+=line;
		/*
		if (this._fetchsize<this._fetch.text.length){
			this._fetch.text=this._fetch.text.substr(0,this._fetchsize);
			this._isFetch=false;
		};
		*/
		return;
	}
	var parts = line.split(' ');
	if (parts.length>1){
		if (parts[0]=='*'){
			switch (parts[1]){
				case 'LIST':
					var entry = {
						children: true
					}
					if (parts[2]==='(\\HasNoChildren)'){
						entry.children = false;
					}
					if (parts[4]){
						entry.text=parts[4].replace(/"/g,'');
					}
					this._list.push(entry);
					
					this._parsed=true;
					break;
				case 'SEARCH':
					
					for(var i=2; i<parts.length;i++){
						this._search.push(parts[i]);
					}
					
					this._parsed=true;
					break;
				default:
					if (parts[2]==='FETCH'){
						var p = parts.slice(3, parts.length).join(' ');
						if (p.indexOf('(RFC822')==0){
							var s = this._parenthesizedList(p.substr(1));
							
							this._fetchsize = (s[1].replace(/\{/,'').replace(/\}/,''))*1;
							console.log(this._fetchsize);
						}else{
							this._parseFetch(parts.slice(3, parts.length).join(' '));
							
						}
						this._isFetch=true; // followedLines will be attached to this._fetch.text
						this._parsed=true;
					}
					break;
			}
		}
	}
}
/**
*
*/
Message.prototype._parseFetch = function(line){
	//console.log(line + line.indexOf('FLAGS'));
	var pos = 0;
	var param = '';
	
	if (line.indexOf('FLAGS')>=0){
		 
		pos = line.indexOf('FLAGS');
		param = this._fetchParam(pos,line,'(',')');
		 
		this._fetch.flags = param.split(' ');
	}
	
	
	if (line.indexOf('INTERNALDATE')>=0){
		pos = line.indexOf('INTERNALDATE');
		param = this._fetchParam(pos,line,'"','"');
		this._fetch.internaldate = param;
	}
	
	if (line.indexOf('RFC822.SIZE')>=0){
		pos = line.indexOf('RFC822.SIZE');
		param = this._fetchParam(pos,line,' ',' ');
		this._fetch.size = param;
	}
	
	if (line.indexOf('ENVELOPE')>=0){
		pos = line.indexOf('ENVELOPE');
		param = this._fetchParam(pos,line,'(',')');
		var l = this._parenthesizedList(param);
		var o = {
			date: this._listEntry(l[0]),
			subject: this._listEntry(l[1]),
			from: this._adressStruct(l[2]),
			sender: this._adressStruct(l[3]),
			replyTo: this._adressStruct(l[4]),
			to: this._adressStruct(l[5]),
			cc: this._adressStruct(l[6]),
			bcc: this._adressStruct(l[7]),
			inReplyTo: this._listEntry(l[8]),
			messageId: this._listEntry(l[10])
		};
		this._fetch.envelope =o;
	}
	console.log(this._fetch); 
}
Message.prototype._adressStruct=function(str){
	
	str = str.replace(/\(/g,'').replace(/\)/g,'');
	var l = this._parenthesizedList(str);
	 
	var o={
		name: this._listEntry(l[0]),
		sourceroute: this._listEntry(l[1]),
		mailbox: this._listEntry(l[2]),
		host: this._listEntry(l[3])
	}
	return o;
}
Message.prototype._listEntry=function(str){
	//console.log(str);
	if (typeof str==='undefined'){
		return '';
	}
	if (str=='NIL'){
		return '';
	}
	return str.replace(/"/g,'');
}

Message.prototype._parenthesizedList=function(str){
	var res = [];
	var openIndex=0;
	var openString=false;
	var last=0;
	for(var i=0;i<str.length;i++){
		var c = str.substr(i,1);
		//console.log(c+"<< " +( (openString)?'o':'x' ) +' ' +( openIndex ));
		if (openIndex===0){
			if (openString===false){
				if (c===' '){
					if (last!=i){
						res.push(str.substr(last,i-last));
					}
					last=i;
				}
			}
		}
		if (c=='('){
			openIndex++;
		}
		if (c==')'){
			openIndex--;
		}
		if (c=='"'){
			//console.log('*******');
			openString= !openString;
		}
	}
	res.push(str.substr(last));
	
	return res;
}

Message.prototype._fetchParam=function(startPos,line,countFor,waitFor){
	var res = '';
	var openIndex=0;
	var startIndex=0;
	var setStartIndex=true;
	for(var i=startPos;i<line.length;i++){
		var c = line.substr(i,1);
		
		if ((openIndex==0)&&(c==countFor)){
			if (setStartIndex===true){
				startIndex=i;
			}
			if ((waitFor==countFor)){
				setStartIndex=false;
			}
		}
		
		if ((waitFor!=countFor) && (c==countFor)){
			
			openIndex++;
		}
		
		if ((waitFor!=countFor) && (c==waitFor)){
			openIndex--;
		}
		if ( (startIndex!=i)&&(openIndex==0)&&(c==waitFor)){
			var subPart = line.substr(startIndex+1,i-startIndex-1);
			res = subPart;
			break;
		}
		
	}
	return res;
}