// ==UserScript==
// @name        test
// @namespace   test
// @include     http://movie.douban.com/doulist/*
// @include     http://movie.douban.com/subject/*
// @version     1
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_addStyle
// @grant GM_xmlhttpRequest
// @grant GM_log
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// ==/UserScript==

// TODO
// 1. 为fork按钮添加样式 done
// 2. fork增加process提示 done
// 3. 在电影页面增加快速添加到豆列功能 done
// 4. 自己的豆列不能fork，已经fork的豆列不能fork
// 5. userscript include 页面
// 6. 给fork from 添加链接 done
// 7. 存储已fork的豆列


//
var DL = {

	create_url: {
		movie: 'http://movie.douban.com/doulist/new?cat=1002',
		music: '',
		book: '',
		note: '',
		subject: '' 
	},
	getType: function() {
		var url = window.location.href;
		if( url.indexOf('movie') !== -1 ) {
			return 'movie' 
		}
	}
}

var utils = {

}


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
		width: 200px; \
		background-color: #eeeeee; \
		padding: 3px; \
	} \
	#dl_wrap li { \
		display: block; \
	    float: none; \
	    font-size: 13px; \
	    margin: 0; \
	} \
	#dl_wrap a { \
		display: block; \
		padding: 5px; \
	}'
)


/* Common */
// Selector
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

// Xpath
function xpath(query, context) {
	return document.evaluate(context?(query.indexOf('.')==0?query:'.' + query):query, context || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
};


// Object to MetaData
function implodeUrlArgs(obj) {
	var a = [];
	for ( var k in obj ) {
		a.push( k +'='+ encodeURIComponent(obj[k]) );
	}
	return a.join('&');
}

// Loadings tip
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

function getCookie(c_name) {
	if (document.cookie.length > 0){
		c_start = document.cookie.indexOf(c_name + '=');
		if (c_start!=-1){ 
			c_start = c_start + c_name.length + 1;
			c_end = document.cookie.indexOf(';',c_start);
			if (c_end == -1){ c_end = document.cookie.length;}
			return unescape(document.cookie.substring(c_start,c_end));
		}
	}
	return '';
}


/* 快速添加豆列 */
function getDoulist(url) {

	var dl_wrap = $('#dl_wrap');
	if( dl_wrap !== null ) {
		dl_wrap.style.display = 'block';
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
				cont.innerHTML = result.responseText;
				var dl_wrap = xpath('//table[@class="list-b"]/tbody/tr/td/a', cont);
				var dl_all = [];
				for(var i = 0; i < dl_wrap.snapshotLength; i++) {
					var data = {
						name: dl_wrap.snapshotItem(i).textContent,
						link: dl_wrap.snapshotItem(i).href
					}
					dl_all.push(data);
				}
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
		li.appendChild(a);
		ul.appendChild(li);
	}
	var btn_ul = $('.ul_subject_menu')[0];
	var btn_add = btn_ul.childNodes[6].previousSibling;
	btn_add.appendChild(ul);
}

function quickAdd() {
	var btn_ul = $('.ul_subject_menu')[0];
	var btn_add = btn_ul.childNodes[6].previousSibling.lastChild; 
	var link = btn_add.href;
	btn_add.parentNode.addEventListener('mouseover', function(e){

		getDoulist(link);

	}, false);

	btn_add.parentNode.addEventListener('mouseout', function(e){
		$('#dl_wrap').style.display = 'none';
	});

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
			var ck = getCookie('ck');
			GM_setValue('ck', ck);
			loading.show();
			// createNewDoulist();
		}
	}, false);
}

function createNewDoulist() {

	var ck = GM_getValue( 'ck', null);
	if( ck === null ) {
		return;
	}else{
		var	dl_about = $('.indent')[0].textContent,
			dl_title = $(' h1')[0].textContent,
			this_doulist = window.location.href;

		GM_xmlhttpRequest({
			method: 'POST',
			url: 'http://movie.douban.com/doulist/new?cat=1002',
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'User-Agent':'Mozilla/5.0 (Windows NT 6.1; rv:17.0) Gecko/20100101 Firefox/17.0',
				'Content-type':'application/x-www-form-urlencoded',
			},
			data: implodeUrlArgs({
				"ck": ck,
				"dl_about": dl_about+'<br>forked from<a href="'+this_doulist+'">'+dl_title+'</a>',
				"dl_submit": "创建电影豆列",
				"dl_title": '(forked)'+dl_title
			}),
			onload: function(result) {
				var fork_id = result.finalUrl.replace('http://movie.douban.com/doulist/','').replace('/','');
				collectSubjects( fork_id );
				storeForked(fork_id);
				alert('created')
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
function collectSubjects(fork_id) {
	var item_wrap = $( '.doulist_item' );
	var items = [];
	var links = [];

	// first page
	for(var i = 0; i < item_wrap.length; i++) {
		items.push( item_wrap[i].firstChild.childNodes[1].href );
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
					var more_item = xpath( '//tr[@class="doulist_item"]/td/a', cont );
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
		addSubjects( fork_id, items );	
	}
}

// 如果豆列少于五部电影会无法提交成功 貌似最少也要提交5个subject
// 最简单的解决办法是为每个豆列都加一个空subject的字符串tail
// 为豆列添加item
function addSubjects(id, items){
	var add_url = 'http://movie.douban.com/doulist/'+id+'/add_multi';
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
		data: 'ck='+GM_getValue('doulist_ck')+'&'+new_item.join( '&' )+tail,
		onload: function(result) {
			loading.hide();
			console.log('ck='+GM_getValue('doulist_ck')+'&'+new_item.join( '&' ))
			alert('done')
		}
	});

}

if( window.location.href.indexOf('doulist') !== -1 ) {
	fork();
}

// quickAdd();