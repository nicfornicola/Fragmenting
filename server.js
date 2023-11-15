let http = require('http')
let fs   = require('fs');
let PNG  = require('pngjs').PNG;
const express = require('express');
const app = express();
const port = 3000;
app.use(express.static(__dirname+'/public'));

// Image name to be fragmented
let imgName = "umbrella"
// How many images will be created and fragmented
let loops = 6

let dirPath = './public/images/' + imgName;


app.get('/', async (req, res) => {
    fs.readFile('./home.html', function(error, content) {
        res.writeHead(200, { 'Content-Type': 'text/html' });

        let imgPathFragged = dirPath + '/' + imgName + 'Fragged' + loops + '.png'
        fs.readFile(imgPathFragged, (err, data) => {
            let htmlList = "";
            // Check if a fragged file exists
            if (!err && data) {
                // Setup template for html tags
                let listItem = 
                        '<hr>' +
                        '<li>' +
                            '{{percentA}}' +
                            '<br>' +
                            '<img class="img" src="/images/{{imgName}}/{{imgName}}Fragged{{fragNumA}}.png" alt="Fragment{{fragNumA}}">' +
                            '{{percentB}}' +
                            '<img class="img" src="/images/{{imgName}}/{{imgName}}Fragged{{fragNumB}}.png" alt="Fragment{{fragNumB}}">' +
                        '</li>';

                // Start at one so we ignore the 0, just show original
                for(let i = 1; i <= loops; i+=2) {
                    // Concat the list items on to the string and replaceAll {{variables}} with proper stuff
                    // Do two at a time so they are side by side in the window (this is why i+=2)
                    htmlList = htmlList.concat(listItem)
                        .replaceAll("{{fragNumA}}", i)
                        .replaceAll("{{percentA}}", (i) + "0% ")
                        .replaceAll("{{fragNumB}}", i+1)
                        .replaceAll("{{percentB}}", "  " + (i+1) + "0% ");
                }
            }

            // Make html buffer into string for replacing
            // Put the completed list into the <ul> where {{list}} is and set the Original file path
            let filledHtml = content.toString('utf8')
            .replaceAll("{{list}}", htmlList)
            .replaceAll("{{imgName}}", imgName);

            // Send new String to Buffer to be served
            res.end(Buffer.from(filledHtml, 'utf8'), 'utf-8');
            
        })

        
    });
});

// This is called when Fragment button is clicked
app.get('/frag', async (req, res) => {
    fragmentImage(imgName);
    res.send('Fragment!');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function fillMap(factorOfFragment, killMap) {
    // Fill the killMap with trues where we are going to kill stuff
    for (let y = 0; y < 17; y++) {
        for (let x = 0; x < 17; x++) {
            let rint = getRandomInt(10)
            // If chunk is false and random number is less then factor, kill this chunk = true
            if(!killMap[y][x] && rint < factorOfFragment) {
                killMap[y][x] = true;
            } 
        }
    }
}

function deleteChunks(img, killMap) {
    // Keeps tracks of 16x16 chunks 
    let yCounter = 0;
    let xCounter = 0;
    for (let y = 0; y < img.height ; y++) {
        for (let x = 0; x < img.width ; x++) {
            // Byte magic, don't ask
            let i = (img.width * y + x) << 2;
            let pixels = img.data;
            
            // If there is a true for this chunk in the killMap, kill it
            if(killMap[yCounter][xCounter]) {
                // Must do it 3 times because each RBG needs to be 255 for white
                pixels[i] = 255;
                pixels[i + 1] = 255;
                pixels[i + 2] = 255;
            }

            // If we are at a multiple of 16 then this ends the chunk, move on to next
            if(x % Math.ceil(img.width/16) == 0) {
                xCounter++;
            }
        }
        // Reset x chunk counter since we are going down a row
        xCounter = 0;
        // If we are at a multiple of 16 then this ends the chunk, move on to next
        if(y % Math.ceil(img.height/16) == 0)
            yCounter++;
    }

    // Return the fragmented image
    return img;
}

const fragmentImage = async () => {
    let killMap = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]]

    // Create the folder path
    await fs.promises.mkdir(dirPath, { recursive: true })
    console.log("\nNew Fragmented pictures: " + dirPath)

    // Original image path 
    let imgPath = './public/images/'+ imgName +'.png'
    console.log("Original image used: " + imgPath + "\n")
    
    // Set where the stream will read from
    let readStream = fs.createReadStream(imgPath);

    // Loop through n times to create n new images
    for (let factorOfFragment = 1; factorOfFragment <= loops; factorOfFragment++) {
        // Create new PNG and start the process
        readStream.pipe(new PNG()).on('parsed', function() {

            // Fill kill map with current factorOfFragment percentage of true so we know which chunks to delete
            fillMap(factorOfFragment, killMap);
            // Delete the 16x16 chunks
            deleteChunks(this, killMap);

            // Set the path for the new image to be created
            let imgPathFragged = dirPath + '/' + imgName + 'Fragged' + factorOfFragment + '.png'
            console.log("Fragmenting " + factorOfFragment + "0%...")
            console.log("Created: " + imgPathFragged)

            // Write the new image to the file
            let writeStream = fs.createWriteStream(imgPathFragged);
            this.pack().pipe(writeStream);
        })
    }
}