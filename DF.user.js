// ==UserScript==
// @name       	DoulistForker 
// @namespace   DoulistForker
// @include     http://movie.douban.com/doulist/*
// @include     http://movie.douban.com/subject/*
// @include     http://music.douban.com/doulist/*
// @include     http://music.douban.com/subject/*
// @include     http://book.douban.com/doulist/*
// @include     http://book.douban.com/subject/*
// @include     http://www.douban.com/doulist/*
// @include     http://www.douban.com/subject/*
// @include		http://www.douban.com/photos/album/*
// @include		http://www.douban.com/note/*
// @version     0.1
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// @grant GM_log
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// ==/UserScript==

// TODO
// 储存已fork的豆列，forked豆列不能再次forked
// 快速添加到豆列dialog
// 日记相册东西等的fork和快速添加


/* Style */

GM_addStyle('#fork_btn { \
		margin-bottom: -8px; \
	} \
	#fork_btn.disabled { \
		opacity: 0.4; \
	} \
	.fork-load { \
		display: inline-block; \
		width: 16px; \
		height: 16px; \
		margin: -5px 5px; \
		background: url("http://img3.douban.com/pics/loading.gif"); \
	} \
	#dl_wrap { \
		position: absolute; \
		width: 300px; \
		background-color: #FFFFFF; \
		padding: 3px; \
		border: 1px solid rgba(0, 0, 0, 0.2); \
		border-radius: 6px; \
		box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2); \
	} \
	#dl_wrap li { \
		display: block; \
	    float: none; \
	    margin: 0; \
	} \
	#dl_wrap a { \
		display: block; \
		padding: 5px 20px;\
		color: #333333; \
		line-height: 18px; \
		font-size: 13px; \
	} \
	#dl_wrap a:hover { \
		background-color: #0081c2; \
		background-image: linear-gradient(to bottom, #009129, #00c438); \
		color: #FFFFFF; \
	}'
);


/* Utils */

/* Selector */
function $(select) {
	var name = select.substring(1);
		switch(select.charAt(0)) {
			case '#':
				return document.getElementById(name);
			case '.':
				return document.getElementsByClassName(name);
			case '/':
				return document.getElementsByName(name);
			default: 
				return document.getElementsByTagName(name);
		}
}

/* Xpath */
function xpath(query, context) {
	return document.evaluate(context?(query.indexOf('.')==0?query:'.' + query):query, context || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
};


/* Object to MetaData */
function implodeUrlArgs(obj) {
	var a = [];
	for ( var k in obj ) {
		a.push( k +'='+ encodeURI( obj[k]) );
	}
	console.log(a)
	return a.join('&');
}

/* Loadings tip */
var loading = {
	show: function() {
		var fork_btn = $('#fork_btn');
		var load_tip = document.createElement('div');
		load_tip.className = 'fork-load';
		insertBefore(load_tip, fork_btn);
	},
	hide: function() {
		var load_tip = xpath('//div[@class="fork-load"]').snapshotItem(0);
		load_tip.style.display = 'none';
	}
}

/* Append */
function insertBefore(dom, target) {
	target.parentNode.insertBefore(dom, target);
}

function insertAfter(dom, target) {
	if( target.previousSibling.length > 0 ) {
		insertBefore(dom, target.nextSibling);
	}else{
		target.parentNode.appendChild(dom);	
	}
}

/* Cookies */
function getCookie(c_name) {
	if (document.cookie.length > 0){
		c_start = document.cookie.indexOf(c_name + '=');
		if (c_start!=-1){ 
			c_start = c_start + c_name.length + 1;
			c_end = document.cookie.indexOf(';',c_start);
			if (c_end == -1){ c_end = document.cookie.length;}
			// 去掉双引号
			return unescape(document.cookie.substring(c_start,c_end).replace(/(^\"*)|(\"*$)/g, ""));
		}
	}
	return '';
}


/* Doulist info */
var href = window.location.href;

var DL = {

	movie: {
		name: 'movie',
		dl_submit: '创建电影豆列',
		create_url: 'http://movie.douban.com/doulist/new?cat=1002',
		doulist_url: 'http://movie.douban.com/doulist/',
		key: '1002',
		flag: '1'
	},
	music: {
		name: 'music',
		dl_submit: '创建音乐豆列',
		create_url: 'http://music.douban.com/doulist/new?cat=1003',
		doulist_url: 'http://music.douban.com/doulist/',
		key: '1003',
		flag: '1'
	},
	book: {
		name: 'book',
		dl_submit: '创建图书豆列',
		create_url: 'http://book.douban.com/doulist/new?cat=1001',
		doulist_url: 'http://book.douban.com/doulist/',
		key: '1001',
		flag: '1'
	},
	thing: {
		name: 'thing',
		dl_submit: '创建东西豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=3065',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '3065'
	},
	album: {
		name: 'album',
		dl_submit: '创建相册豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=1026',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '1026'
	},
	note: {
		name: 'note',
		dl_submit: '创建日记豆列',
		create_url: 'http://www.douban.com/doulist/new?cat=1015',
		doulist_url: 'http://www.douban.com/doulist/',
		key: '1015'
	},
	getType: function() {
		// var type = href.substring(7, url.indexOf('.'));
		// 舞台剧日记等并没有独立二级域名
		try{
			// var type = xpath('//a[contains(@href,"/doulist/new?cat=")]').snapshotItem(0).href;
			var type = $( '.lnk-doulist-add' )[0].href;
			if( type.indexOf('3065') !== -1 ){
				return DL.thing;
			}
			if( type.indexOf('1026') !== -1 ){
				return DL.album;
			}
		}catch(e){}

		if( href.indexOf('movie') !== -1 ){
			return DL.movie;
		}
		if( href.indexOf('music') !== -1 ){
			return DL.music;
		}
		if( href.indexOf('book') !== -1 ){
			return DL.book;
		}
		if( href.indexOf('note') !== -1 ){
			return DL.note;
		}
		// switch(type) {
		// 	case 'movie':
		// 		return DL.movie;
		// 	case 'music':
		// 		return DL.music;
		// 	case 'book':
		// 		return DL.book;
		// }
	}
}

/* 快速添加豆列 */
function getDoulist(url) {

	var ul = $('#dl_wrap');
	if( ul !== null ) {
		ul.style.display = 'block';
	}else{
		GM_xmlhttpRequest({
			url: url,
			method: 'GET',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0'
			},
			onload: function(result) {
				var cont = document.createElement('div');
				var dl_wrap;
				cont.innerHTML = result.responseText;
				if( DL_type.name == 'movie' || DL_type.name == 'book' || DL_type.name == 'music' ) {
					dl_wrap = xpath('//table[@class="list-b"]/tbody/tr/td/a', cont);
					// dl_wrap = xpath('//a[contains(@href,"/subject/")]', cont);
				}else{
					dl_wrap = xpath('//a[contains(@href,"cat_id")]', cont);
				}
				
				var dl_all = [];
				for(var i = 0; i < dl_wrap.snapshotLength; i++) {
					var data = {
						name: dl_wrap.snapshotItem(i).textContent,
						link: dl_wrap.snapshotItem(i).href
					}
					dl_all.push(data);
				}
				console.log(dl_all)
				showDoulist(dl_all);
			}
		});
	}
}

function showDoulist(dl_all) {

	var ul = document.createElement('ul');
	ul.id = 'dl_wrap';
	for( var i = 0; i < dl_all.length; i++ ) {
		var li = document.createElement('li');
		var a = document.createElement('a');
		a.href = dl_all[i].link;
		a.textContent = dl_all[i].name;
		a.addEventListener('click', function(e){
			// TODO
			// dialog
			// e.preventDefault();
		},false);
		li.appendChild(a);
		ul.appendChild(li);
	}
	var btn_add = xpath('//a[contains(@href,"doulists?add")]').snapshotItem(0);
	btn_add.appendChild(ul);

	// hide doulist
	btn_add.parentNode.addEventListener('mouseout', function(e){
		$('#dl_wrap').style.display = 'none';
	},false);
}

function quickAdd() {

	// 将包裹的DIV的overflow去掉，否则豆列无法显示
	var thing_tag1 = $( '.item-subject' ),
		thing_tag2 = $( '.thing-rec' ),
		album_tag = $( '.sns-bar' );
	if( thing_tag1.length > 0 && thing_tag2.length > 0 ) {
		thing_tag1[0].style.overflow = 'visible';
		thing_tag2[0].style.overflow = 'visible';
	}
	if( album_tag.length > 0 ) {
		album_tag[0].style.overflow = 'visible';
	}


	var btn_add = xpath('//a[contains(@href,"doulists?add")]').snapshotItem(0);
	btn_add.style.position = 'relative';
	var link = btn_add.href;
	btn_add.parentNode.addEventListener('mouseover', function(e){

		getDoulist(link);

	}, false);

	console.log(btn_add);
}


/* Fork */
function fork() {

	var rec = $('.rec')[0]; 
	var fork_btn = document.createElement('a');
	fork_btn.id = 'fork_btn';
	fork_btn.className = 'redbutt';
	fork_btn.href = 'javascript:;'
	fork_btn.innerHTML = '<span>Fork</span>';
	rec.parentNode.insertBefore(fork_btn, rec);

	var fork = $('#fork_btn');
	$('#fork_btn').addEventListener('click', function(e) {
		var target = e.target.parentNode;
		if( target.getAttribute('class').indexOf('disabled') !== -1 ) {
			alert('disabled');
			return;	
		}else{

			target.setAttribute('class', target.getAttribute('class')+' disabled');
			loading.show();

			createNewDoulist();
		}
	}, false);
}

function createNewDoulist() {

	var ck = getCookie('ck');
	if( ck === null ) {
		return;
	} else {
		var	dl_about = $('.indent')[0].textContent,
			dl_title = $(' h1')[0].textContent,
			this_doulist = window.location.href;

		GM_xmlhttpRequest({
			method: 'POST',
			url: DL_type.create_url,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:19.0) Gecko/20100101 Firefox/19.0',
				'Content-type':'application/x-www-form-urlencoded'
			},
			data: implodeUrlArgs({
				"ck": ck,
				"dl_about": dl_about,
				"dl_submit": DL_type.dl_submit,
				"dl_title": dl_title+' (forked from '+this_doulist+')'
			}),
			onload: function(result) {
				console.log(result);
				var fork_id = result.finalUrl.replace(DL_type.doulist_url,'').replace('/','');
				alert('created')
				alert(fork_id)
				collectSubjects( fork_id );
				// storeForked(fork_id);
			},
			onerror: function(err) {
				alert(err)
				console.log(err);
			}
		});
	}
}


// 存储已经fork的豆列
function storeForked(fork_id) {
	var dl = [];
	var forked_doulist = GM_getValue('focked_doulist', null);
	if( forked_doulist === null ) {
		dl.push(fork_id);
	}else{
		dl = forked_doulist.split(',');
		dl.push(fork_id);
	}
	GM_setValue('forked_doulist', dl.toString())	
}

// 收集豆列中的所有item
// TODO
// 相册收集出错
function collectSubjects(fork_id) {
	var item_wrap = $( '.doulist_item' );
	var items = [];
	var links = [];
	
	// first page	
	if( DL_type.name == 'note' || DL_type == 'album' ) {
		for(var i = 0; i < item_wrap.length; i++) {
			items.push( xpath( '//div[@class="title"]/a').snapshotItem(i).href );
		}
		
	} else {
		for(var i = 0; i < item_wrap.length; i++) {
			items.push( xpath( '//tr[@class="doulist_item"]/td/a' ).snapshotItem(i).href );
		}
	}
	

	if( $('.paginator')[0] !== undefined ) {
		var page = $('.paginator')[0].childNodes;
		for(var i = 0; i < page.length; i++) {
			if( page[i].nodeName === 'A' ){
				links.push(page[i].href);
			}
		}

		for(var i = 0; i < links.length; i++ ) {
			GM_xmlhttpRequest({
				method: 'GET',
				url: links[i],
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0'
				},
				onload: function(result) {
					var cont = document.createElement( 'div' );
					cont.innerHTML = result.responseText;
					var more_item;
					if( DL_type.name == 'note' || DL_type == 'album' ) {
						more_item = xpath( '//div[@class="title"]/a', cont );
					} else {
						more_item = xpath( '//tr[@class="doulist_item"]/td/a', cont );
					}
					
					for(var i = 0; i < more_item.snapshotLength; i++) {
						console.log(more_item.snapshotItem(i));
						var item_href = more_item.snapshotItem(i).href
						items.push( item_href );
					}
					alert('collected')
					addSubjects( fork_id, items );
				}
			});
		}
	}else{
		alert('collected');
		console.log(items)
		addSubjects( fork_id, items );	
	}
}

// 如果豆列少于五部电影会无法提交成功 最少也要提交5个subject
// 最简单的解决办法是为每个豆列都加一个空subject的字符串tail
// 为豆列添加item
function addSubjects(id, items){
	var add_url = DL_type.doulist_url+id+'/add_multi';
	var new_item = [];
	for(var i = 0; i < items.length; i++ ) {
		var k = 'subject=' + encodeURIComponent( items[i] );
		new_item.push( k );
	}

	var tail = '&subject=http%3A%2F%2F&subject=http%3A%2F%2F&subject=http%3A%2F%2F&subject=http%3A%2F%2F';
	GM_xmlhttpRequest({
		method: 'POST',
		url: add_url,
		headers: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0',
			'Content-type':'application/x-www-form-urlencoded',
		}, 
		data: 'ck='+getCookie('ck')+'&'+new_item.join( '&' )+tail,
		onload: function(result) {
			loading.hide();
			console.log('ck='+getCookie('ck')+'&'+new_item.join( '&' ))
			alert('done')
		}
	});

}

/* RUN */

DL_type = DL.getType();

if( href.indexOf('doulist') !== -1 ) {
	console.log(DL_type);
	fork();
} else {
	console.log(DL_type);
	quickAdd();
}