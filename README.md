This generates Json files and a Typescript interface for Google Fonts.

The generated Typescript interface by the [@tjmora/g-font](https://github.com/tjmora/g-font).


### Usage

Clone this repo and the [@google/fonts](https://github.com/google/fonts) repo to the same 
directory:

```
git clone https://github.com/google/fonts
git clone https://github.com/tjmora/google-fonts-data-generator
```

Then go inside the google-fonts-data-generator folder:

```
cd google-fonts-data-generator
```

Then generate the files:

```
npm run generate
```

Next time you do this, be sure to update your clone of both repositories:

```
cd fonts
git pull origin master
cd ../google-fonts-data-generator
git pull origin main
```
