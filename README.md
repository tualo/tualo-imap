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

Implemented
============

Folowing IMAP commands are implemented now.

* login
* logout
* search (search in a mailboxe)
* list (list mailboxes)
* fetch (fetch a mail)
* create (create a mailbox)
* delete (delete a mailbox)
* rename (rename a mailbox)
* subscripe
* unsubscripe
* lsub
* expunge
* store
* copy
* noop


Example
=======

* Fetch the message number 1 from the inbox, command can be chained and executed at one time. But they can also executed separatly.

```javascript
var Imap = require('tualo-imap');
var imap = new Imap({
	user: 'mygmailname@gmail.com',
	password: 'mygmailpassword',
	host: 'imap.gmail.com',
	port: 143,
	secure: true,
	debug: false
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

imap.on('chained',function(conn){
	console.log('[test] chain finished');
	console.log(imap.get('inbox list')); // show the list result
	console.log(imap.get('search result')); // show the search result
	console.log(imap.get('fetch result')); // show the fetch result
})

imap.chained()
	.connect()
	.login() // login
	.select('inbox') // open the inbox
	.list('inbox','*','inbox list') // list all boxes in inbox, 
	.search('BODY "some text"','','search result') // searches for *some text* in the body text
	.fetch(1,'RFC822','fetch result') // fechtes the full mail number 1
	.logout() // logout
	.execute(); // execute the chain
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

## Connection.login([key]:string)

  Sends the login to the Server.
  Emits *LOGIN* (or the key name) on success and *imap error* on failure
  
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.capability([key]:string)

  Sends the capability-command to the Server.
  Emits *CAPABILITY* (or the key name) on success and *imap error* on failure
  
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.select(box:string, [key]:string)

  Sends the select-command to the Server.
  Emits *SELECT* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.examine(box:string, [key]:string)

  Sends the examine-command to the Server.
  Emits *EXAMINE* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.create(box:string, [key]:string)

  Create the given mailbox.
  Emits *CREATE* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.delete(box:string, [key]:string)

  Delete the given mailbox
  Emits *EXAMINE* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.delete(box:string, [key]:string)

  Rename the given mailbox (box) to newname.
  Emits *RENAME* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.subscripe(box:string, [key]:string)

  Subscripe the given mailbox.
  Emits *SUBSCRIBE* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.unsubscripe(box:string, [key]:string)

  Unsubscripe the given mailbox.
  Emits *UNSUBSCRIBE* (or the key name) on success and *imap error* on failure.
  
  -box is the name of the mailbox to be selected (ie. "INBOX")
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.unsubscripe()

  Delete all messages that have the \Deleted flag.
  Emits *EXPUNGE* (or the key name) on success and *imap error* on failure.
  *

## Connection.store(sequence:string, dataitem:string, value:array, [key]:string)

  Alters data associated with a message in the mailbox. @link http://www.faqs.org/rfcs/rfc3501.html (section 6.4.6)

## Connection.copy(sequence:string, box:string, [key]:string)

  Copies the given message(s) to the end of the mailbox. @link http://www.faqs.org/rfcs/rfc3501.html (section 6.4.7)

## Connection.lsub(reference:string, name:string, [key]:string)

  List all subscriped mailboxes.
  Emits *LSUB* (or the key name) on success and *imap error* on failure.
  
  -reference the box from where the listing starts (ie. "INBOX")
  -name of the mailboxes to be listet  (wildcards "*" are possible)  {@link http://www.faqs.org/rfcs/rfc3501.html} (section 6.3.9)
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.list(reference:string, name:string, [key]:string)

  List all mailboxes that matches to the given name within the reference.
  Emits *LIST* (or the key name) on success and *imap error* on failure.
  
  -reference the box from where the listing starts (ie. "INBOX")
  -name of the mailboxes to be listet  (wildcards "*" are possible)  {@link http://www.faqs.org/rfcs/rfc3501.html} (section 6.3.8)
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.search(criteria:string, charset:string, [key]:string)

  Searches the mailbox for messages that match the given searching criteria.
  Emits *SEARCH* (or the key name) on success and *imap error* on failure
  
  -criteria you are seaching for. Have a look at {@link http://www.faqs.org/rfcs/rfc3501.html} (section 6.4.4)
  -charset the charset for searching
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.fetch(number:number, item:string, [key]:string)

  Fetches the message with the given number.
  Emits *FETCH* (or the key name) on success and *imap error* on failure
  
  -number the number of the message to be fechted (ie. Numbers received by SEARCH)
  -item the message item  {@link http://www.faqs.org/rfcs/rfc3501.html} (section 6.4.5)
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.starttls([key]:string)

  Send the startls command.
  Emits *STARTTLS* (or the key name) on success and *imap error* on failure
  !!!! UNTESTET !!!!
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.starttls([key]:string)

  Send the noop command.
  Emits *NOOP* (or the key name) on success and *imap error* on failure
  
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.logout([key]:string)

  Send the logout command.
  Emits *LOGOUT* (or the key name) on success and *imap error* on failure
  
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection.sendRawCommand(command:string, key:string)

  Send a command to the server.
  
  -command the raw IMAP command
  -key is the name for storing the result, it can be read with get @see {Connection}.get()

## Connection._send()

  Internal helper for sending commands to the server.
  This method set the prefix counter for each command.

## Connection._resetChainCommands()

  Internal helper for cleaning/ initialization of the command-chain.

## Connection._appendChainCommand(command:mixed)

  Internal helper for appending a command to the chain.

## Connection._executeNextCommand()

  Internal helper for executing the command-chain.
	
## Message()

  Create a new instance of Message. 
  Message parses a messages of th IMAP server.
  
  -rawText of the message recieved from th IMAP server.

## Message.toString()

  Returns the raw message text.

## Message.getList()

  Return all parsed list entries.
  Return a list of all List entries.
  (ie. [{text: 'INBOX',children: true},{text: 'BOX2',children: true}]

## Message.getSearchList()

  Return all parsed search numbers.
  ie. ['9','11','12',...]

## Message.getFetched()

  Return the parsed Fetch-Object.

## Message._parse()

  Parses the message.

## Message._parseLine()

  Parses a single line.

## Message._parseFetch()

  Parses a fetch line.

## Message._adressStruct()

  Parses an address struct.

## Message._listEntry(str:string)

  Parses an list entry, check if it's set to *NIL* and removes double qoutes at the begining and at the end of the entry.

## Message._parenthesizedList(str:string)

  Parses an parenthesized list entry.

## Message._fetchParam(startPos:number, line:string, countFor:string, waitFor:string)

  Parses an String and return the first string between *countFor* and *waitFor*.
