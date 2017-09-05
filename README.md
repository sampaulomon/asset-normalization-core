### Run assets
Install imagemagick, mono and inkscape.
```
brew install imagemagick
brew install mono caskformula/caskformula/inkscape
```

Install dependencies
```
npm install
```

Launch the job to generate all the lower-resolution derivatives of 4x images
```
gulp raster
```

Launch the job to generate platform specific vector icons
  * Vector Drawable format icons for Android
  * PDF icons for iOS
```
gulp vector
```

To perform everything listed above 
```
gulp                            // Clears up tmp directory before conversion
gulp images                     // Overrides files during conversion
```

To apply action to specific platform

```
gulp raster --platform=ios      // Converts raster images for ios
gulp vector --platform=android  // Converts icons for android
```

Catalog structure
```
└───assets/
    │───images-src4x/
    │   └───**/*.{png,jpeg,...}         // Raster images sources 4x
    │
    │───vector/
    │   └───**/*.svg                    // Vector icons sources (SVG)
    │
    └───tmp/
        │───android/
        │   └───res/
        │       │───main/                   // Default flavor
        │       │   │───drawable/           // Vector images derivatives 
        │       │   │                           (XML - Vector Drawable format)
        │       │   │───drawable-mdpi/      // Raster images derivatives 1x
        │       │   │───drawable-hdpi/      // Raster images derivatives 1.5x
        │       │   │───drawable-xhdpi/     // Raster images derivatives 2x
        │       │   │───drawable-xxhdpi/    // Raster images derivatives 3x
        │       │   └───drawable-xxxhdpi/   // Raster images derivatives 4x
        │       │                           
        │       └───flavor1/                // Flavor "flavor1"
        │           │───drawable/           // Vector images derivatives 
        │           │                           (XML - Vector Drawable format)
        │           │───drawable-mdpi/      // Raster images derivatives 1x
        │           ...
        │                               
        └───ios/
            └───Assets.xcassets/
                │───image1.imageset/
                │   │───image1.png          // Raster images derivatives 1x
                │   │───image1@2x.png       // Raster images derivatives 2x
                │   │───image1@3x.png       // Raster images derivatives 3x
                │   └───Contents.json
                │───vectorImage1.imageset/
                │   │───vectorImage1.pdf    // RVector images derivatives (PDF)
                │   └───Contents.json
                └───Contents.json
```
