var albumBucketName = "aeropete1";
var bucketRegion = "us-east-2";
var IdentityPoolId = "us-east-2:fc6d007c-3a2b-4372-be29-0f442684fdd8";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName }
});

var gIsMinimized = false;
var gImagesToTrack = {};
var gCurrentImage = "";
var gFilesToDwonload = [];
var gIsDownloading = false;
var gQueueID;

function DownloadFile(url)
  {
    gFilesToDwonload.push(url);
  }

function CheckDownloadQueue()
  {
    if(gIsDownloading)
      return;

    if(gFilesToDwonload.length == 0) {
      clearInterval(gQueueID);
      return;
    }

    var url = gFilesToDwonload.pop();
    window.location = url;
    gIsDownloading = true;
  }

  function AddImageMarker(url, path)
  {

    aero.tempImageMarekerInfo = {};
    aero.tempImageMarekerInfo.url = url;
    aero.tempImageMarekerInfo.path = path;
    aero.addImageMarker( { canUndo : false, 
                            filename : path, 
                            physicalWidth : 0.75,
                            serializable : false
                          }, function(ret) {
                            
          gImagesToTrack[ret["uuid"]] = aero.tempImageMarekerInfo;
    }.bind(aero));
  }

function InitializeAeroCallbacks()
  {
    aero.OnFileDownloaded = function(args) {
      console.log(args["url"] + "downloaded to " + args["path"]);
      gIsDownloading = false;
      var url = unescape(args["url"].substr(args["url"].lastIndexOf("https")));
      AddImageMarker(url, args["path"]);
    }.bind(aero);
    
    gQueueID = setInterval(CheckDownloadQueue, 2000);

    aero.onImageMarkerFound = function(ret) {
      console.log("OnImageMarkerFound: " + gImagesToTrack[ret["uuid"]]);
      if(gCurrentImage == "" && gImagesToTrack[ret["uuid"]] != undefined)
      {
        gCurrentImage = ret["uuid"];
        var url = escape(gImagesToTrack[ret["uuid"]].url);
        aero.openURL({"url":url});
        //minimize();
      }

    }.bind(aero);
    
    aero.onSceneLoaded = function(ret) {
      for (const imageID in gImagesToTrack) {
        var url = gImagesToTrack[imageID].url;
        var path = gImagesToTrack[imageID].path;
        AddImageMarker(url, path);
      }
      
    }.bind(aero);

    aero.onImageMarkerUpdated = function(ret) {
      //console.log("OnImageMarkerUpdated: " + ret["uuid"]);
      if(gCurrentImage == "")
      {
        //gCurrentImage = ret["uuid"];
        //aero.openURL({"url":escape(gImagesToTrack[ret["uuid"]])});
        //minimize();
      }

    }.bind(aero);

    aero.onImageMarkerLost = function(ret) {
      console.log("OnImageMarkerLost: " + gImagesToTrack[ret["uuid"]]);
      if(gCurrentImage == ret["uuid"])
      {
         gCurrentImage = "";
      }
    }.bind(aero);
    

  }

function maximize()
{
    gIsMinimized = false;
    
    aero.showWebView( {
        "url":"https://main.d2bl8ynaqy7ng6.amplifyapp.com/?album=Basement1",
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
    
    aero.showWebView( {
        "url":"https://main.d2bl8ynaqy7ng6.amplifyapp.com/?album=Basement1",
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

function listAlbums() {
  s3.listObjects({ Delimiter: "/" }, function(err, data) {
    if (err) {
      return alert("There was an error listing your albums: " + err.message);
    } else {
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          "<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
          "<span onclick=\"viewAlbum('" + albumName + "')\">",
          albumName,
          "</span>",
          "</li>"
        ]);
      });
      var message = albums.length
        ? getHtml([
            "<p>Click on an album name to view it.</p>",
            "<p>Click on the X to delete the album.</p>"
          ])
        : "<p>You do not have any albums. Please Create album.";
      var htmlTemplate = [
        "<h2>Albums</h2>",
        message,
        "<ul>",
        getHtml(albums),
        "</ul>",
        "<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
        "Create New Album",
        "</button>"
      ];
      document.getElementById("modeButton").innerHTML = gNextMode;
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
  albumName = albumName.trim();
  if (!albumName) {
    return alert("Album names must contain at least one non-space character.");
  }
  if (albumName.indexOf("/") !== -1) {
    return alert("Album names cannot contain slashes.");
  }
  var albumKey = encodeURIComponent(albumName);
  s3.headObject({ Key: albumKey }, function(err, data) {
    if (!err) {
      return alert("Album already exists.");
    }
    if (err.code !== "NotFound") {
      return alert("There was an error creating your album: " + err.message);
    }
    s3.putObject({ Key: albumKey }, function(err, data) {
      if (err) {
        return alert("There was an error creating your album: " + err.message);
      }
      alert("Successfully created album.");
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
  var albumPhotosKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";

    var photos = data.Contents.map(function(photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        "<span>",
        "<div>",
        '<img onclick="imageClicked(this.src)" style="width:128px;" src="' + photoUrl + '"/>',
        "</div>",
        "<div>",
        "<span onclick=\"deletePhoto('" +
          albumName +
          "','" +
          photoKey +
          "')\">",
        "X",
        "</span>",
        "<span>",

        "<a href='",
        photoKey.replace(albumPhotosKey, ""),
        "'>",
        photoKey.replace(albumPhotosKey, ""),
        "</a>",
        "</span>",
        "</div>",
        "</span>"
      ]);
    });
    var message = photos.length
      ? "<p>Click on the X to delete the photo</p>"
      : "<p>You do not have any photos in this album. Please add photos.</p>";
    var htmlTemplate = [
      "<h2>",
      "Album: " + albumName,
      "</h2>",
      message,
      "<div>",
      getHtml(photos),
      "</div>",
      '<input id="photoupload" type="file" accept="image/*">',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
      "Add Photo",
      "</button>",
      '<button onclick="listAlbums()">',
      "Back To Albums",
      "</button>"
    ];
    document.body.style.overflow = '';
    document.getElementById("modeButton").innerHTML = gNextMode;
    document.getElementById("app").innerHTML = getHtml(htmlTemplate);
  });
}

function playAlbum(albumName) {
  var albumPhotosKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";

    var photos = data.Contents.map(function(photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      DownloadFile(photoUrl);
      var myHTML = getHtml([
        "<div class='mySlides fade'>",
        "<img onclick=\"imageClicked('" + photoKey.replace(albumPhotosKey, "") + "');\" style='width:100%;' src='",
        photoUrl,
        "'/>",
        "</div>"
      ]);
      console.log(myHTML);
      return myHTML;
    });
    var htmlTemplate = [
      "<h2>",
      "You can find Aero Experiences on these images",
      "</h2>",
      "<div class='slideshow-container'>",
      getHtml(photos),
      "</div>"
    ];
    document.body.style.overflow = 'hidden';
    document.getElementById("modeButton").innerHTML = gNextMode;
    document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    var slideIndex = 0;

    function showSlides() {
      var i;
      var slides = document.getElementsByClassName("mySlides");
      for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
      }
      slideIndex++;
      if (slideIndex > slides.length) {slideIndex = 1}
      slides[slideIndex-1].style.display = "block";
      setTimeout(showSlides, 2000); // Change image every 2 seconds
    }
    showSlides();
  });
}

function addPhoto(albumName) {
  var files = document.getElementById("photoupload").files;
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }
  var url
  
  url = prompt("Please enter the experience URL", "");
  if (url == "") {
    return;
  }
  addPhotoInternal(albumName, url);

}

function addPhotoInternal(albumName, url)
{
  var file = files[0];
  var fileName = url;//file.name;
  var albumPhotosKey = encodeURIComponent(albumName) + "/";

  var photoKey = albumPhotosKey + fileName;

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file,
      ACL: "public-read"
    }
  });

  var promise = upload.promise();

  promise.then(
    function(data) {
      alert("Successfully uploaded photo.");
      viewAlbum(albumName);
    },
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
}

function deletePhoto(albumName, photoKey) {
  s3.deleteObject({ Key: photoKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your photo: ", err.message);
    }
    alert("Successfully deleted photo.");
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
  var albumKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your album: ", err.message);
    }
    var objects = data.Contents.map(function(object) {
      return { Key: object.Key };
    });
    s3.deleteObjects(
      {
        Delete: { Objects: objects, Quiet: true }
      },
      function(err, data) {
        if (err) {
          return alert("There was an error deleting your album: ", err.message);
        }
        alert("Successfully deleted album.");
        listAlbums();
      }
    );
  });
}


function getHtml(template) {
  return template.join('\n');
}