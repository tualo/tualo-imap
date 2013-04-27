Description
===========

tualo-imap is an IMAP client module for [node.js](http://nodejs.org/).

This module makes communication with an IMAP server easy. 
Not all IMAP functions are implement yet.

Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.0 or newer
* An IMAP Account


Installation
============

    npm install tualo-imap

Example
=======

* Fetch the message number 1 from the inbox

```javascript
var Imap = require('tualo-imap');
var imap = new Imap({
	user: 'mygmailname@gmail.com',
	password: 'mygmailpassword',
	host: 'imap.gmail.com',
	port: 993,
	secure: true
}); 

imap.on('error',function(conn,err){
	console.log('[test] error');
	console.log(err);
})

imap.on('imap error',function(conn,keyName,msg,shortmsg){
	console.log('[test] imap error ('+keyName+'): '+msg+' '+shortmsg);
})

imap.on('error chained',function(conn,keyName,msg,shortmsg){
	console.log('[test] error chained ('+keyName+'): '+msg+' '+shortmsg);
})

imap.on('chained',function(imap){
	console.log('[test] chain finished');
	console.log(imap.get('body1'));
})

imap.chained()
	.connect()
	.login()
	.select('inbox','key1') // open the inbox
	.fetch(1,'RFC822','body1') // fetch the hole mail
	.logout()
	.execute();
```

API
===

require('tualo-imap') returns one object: **Connection**.

## Connection()

  Create a new instance of Connection. This instance inherits all functions of the EventEmitter.

## Connection.connect()

  Establish a connection to the imap server.
  Emits *connected* on success, *error* on failure.

## Connection._initConnect(withinChain:boolean)

  Internal connection function, see connect()

## Connection._connect()

  Internal connection function for unsecured connections, see connect()

## Connection._onData()

  Helper function for any data received on the socket.

## Connection._parseData(the:string)

  Helper function for parsing any data received on the socket.

## Connection.get(key:string)

  Returns the message for the specified key

## Connection.chained()

  Initiate chained commands, they will be exceuted only if execute will be called.
  When it's called it will reset the chain. All commands followed will be chained and 
  exceuted when execute. If an error occoured the chain stop at that point and 
  emits the *error chained* event.

## Connection.execute()

  Execute chained commands. If an error occoured the chain stop at that point and 
  emits the *error chained*. The chained *chained* will be emmited when all commands was executed successfully

## Connection.login(optional:key)

  Sends the login to the Server.
  Emits *LOGIN* (or the key name) on success and *imap error* on failure

## Connection.capability(optional:key)

  Sends the capability-command to the Server.
  Emits *CAPABILITY* (or the key name) on success and *imap error* on failure

## Connection.select(the:box, optional:key)

  Sends the select-command to the Server.
  Emits *SELECT* (or the key name) on success and *imap error* on failure

## Connection.fetch(the:number, the:string, optional:key)

  Fetches the message with the given number.
  Emits *FETCH* (or the key name) on success and *imap error* on failure

## Connection.fetchMessage(the:number, optional:key)

  Fetches the message with the given number.
  Emits *FETCH* (or the key name) on success and *imap error* on failure

## Connection.fetchHeader(the:number, optional:key)

  Fetches the message header with the given number.
  Emits *BODYHEADER* (or the key name) on success and *imap error* on failure

## Connection.fetchBody(the:number, optional:key)

  Fetches the message text with the given number.
  Emits *BODYTEXT* (or the key name) on success and *imap error* on failure

## Connection.logout(optional:key)

  Send the logout command.
  Emits *LOGOUT* (or the key name) on success and *imap error* on failure

## Connection._send()

  Internal helper for sending commands to the server.
  This method set the prefix counter for each command.

## Connection._resetChainCommands()

  Internal helper for cleaning/ initialization of the command-chain.

## Connection._appendChainCommand(command:mixed)

  Internal helper for appending a command to the chain.

## Connection._executeNextCommand()

  Internal helper for executing the command-chain.
