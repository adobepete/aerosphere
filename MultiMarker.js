
var gIsMinimized = false;
var gImagesToTrack = {};
var gCurrentImage = "";
var gDownloadQueue = [];
var gMarkerQueue = [];
var gIsDownloading = false;
var gIntervalID;
var gIsFirstScene = true;
var gMarkerAdding = false;
var gAlbumName = "";

function DownloadFile(url)
{
  gDownloadQueue.push(url);
}

function CheckDownloadQueue()
{
  if(gIsDownloading)
    return;

  if(gDownloadQueue.length == 0) 
  {

    if(gMarkerQueue.length == 0)
    {
      clearInterval(gIntervalID);
      playAlbum(gAlbumName);
    }
    else if(!gMarkerAdding)
    {
      var imageObject = gMarkerQueue.pop();
      AddImageMarker(imageObject.url, imageObject.path);
    }
    return;
  }

  var url = gDownloadQueue.pop();
  window.location = url;
  gIsDownloading = true;
}

function ImageMarkerDownloaded(url, path)
{
  var tempImageMarekerInfo = {};
  tempImageMarekerInfo.url = url;
  tempImageMarekerInfo.path = path;
  gMarkerQueue.push(tempImageMarekerInfo);
}

function AddImageMarker(url, path)
{
  aero.tempImageMarekerInfo = {};
  aero.tempImageMarekerInfo.url = url;
  aero.tempImageMarekerInfo.path = path;
  gMarkerAdding = true;
  aero.addImageMarker( { canUndo : false, 
                          filename : path, 
                          physicalWidth : 0.75,
                          serializable : false,
                          detectionResponse : 0
                        }, function(ret) {
        gImagesToTrack[ret["uuid"]] = aero.tempImageMarekerInfo;
        gMarkerAdding = false;
  }.bind(aero));
}

function InitializeAeroCallbacks()
{
  aero.OnFileDownloaded = function(args) {
    console.log(args["url"] + "downloaded to " + args["path"]);
    gIsDownloading = false;
    var url = unescape(args["url"].substr(args["url"].lastIndexOf("https")));
    ImageMarkerDownloaded(url, args["path"]);
  }.bind(aero);
  
  gIntervalID = setInterval(CheckDownloadQueue, 2000);

  aero.onImageMarkerFound = function(ret) {
    if(gImagesToTrack[ret["uuid"]] == undefined)
      return;

    console.log("OnImageMarkerFound: " + gImagesToTrack[ret["uuid"]]);
    var url = gImagesToTrack[ret["uuid"]].url;

    if(gCurrentImage != url && gDownloadQueue.length == 0)
    {
      gCurrentImage = url;

      for (const imageID in gImagesToTrack) {
        aero.removeImageMarker( { canUndo : false, uuid : imageID }, function(ret) {}.bind(aero));
      }
      aero.openURL({"url":escape(url)});
      minimize();
    }

  }.bind(aero);
  
  aero.onSceneLoaded= function(ret) {

    if(gIsFirstScene)
    {
      gIsFirstScene = false;
      //return;
    }
    var imagesToTrack = gImagesToTrack;
    gImagesToTrack = {};
    for (const imageID in imagesToTrack) {
      var url = imagesToTrack[imageID].url;
      var path = imagesToTrack[imageID].path;

      if(url != gCurrentImage)
      {
        var tempImageMarekerInfo = {};
        tempImageMarekerInfo.url = url;
        tempImageMarekerInfo.path = path;
        gMarkerQueue.push(tempImageMarekerInfo);
      }
      else
      {
        gImagesToTrack[imageID] = imagesToTrack[imageID];
      }
    }
    gIntervalID = setInterval(CheckDownloadQueue, 2000);
    
  }.bind(aero);

  aero.onImageMarkerUpdated = function(ret) {
  }.bind(aero);

  aero.onImageMarkerLost = function(ret) {
    console.log("OnImageMarkerLost: " + gImagesToTrack[ret["uuid"]]);
  }.bind(aero);
  

}

function maximize()
{
    gIsMinimized = false;
    var url = mainURL + "?album=Basement1";
    aero.showWebView( {
        "url":mainURL,
        "webViewID":"AeroSphere",
        "vOffset":15,
        "hOffset":0,
        "vAlign":"top",
        "hAlign":"left",
        "width":100,
        "height":70,
        "titleBar": false,
        "hideAeroUI": true
    }
    );
}

function minimize()
{
    gIsMinimized = true;
    var url = mainURL + "?album=Basement1";
    
    aero.showWebView( {
        "url":url,
        "webViewID":"AeroSphere",
        "vOffset":15,
        "hOffset":0,
        "vAlign":"top",
        "hAlign":"left",
        "width":12,
        "height":6,
        "titleBar": false,
        "hideAeroUI": true
    }
    );
}


function toggleMode()
{
  var myURL = window.location.href;
  if(myURL.includes("album="))
  {
    myURL = myURL.substring(0,myURL.indexOf("album=")-1);
  }

  if(gNextMode == "PLAY")
    myURL += "?album=Basement1";

  window.location = myURL;
}


function logoClicked()
{
    if(gIsMinimized)   
        maximize();
    else
        minimize();
}

function imageClicked(url)
{
    aero.openURL({"url":escape(url)});
    minimize();
}