#!/usr/bin/env bash

while getopts i:o: option;
do
    case $option in
        i) src_path=$OPTARG;;
        o) dest_path=$OPTARG;;
    esac
done

if [ -z $src_path ] || [ -z $dest_path ]; then
    echo "Source path (-i) and destination path (-o) are required";
    exit 1 ;
fi

find $src_path -type f -name '*.svg' | while read f; do
    directory=$(dirname "$f");
    filename=$(basename "$f");
    dest=${directory/$src_path/$dest_path};
    name=${filename%.*};

    mkdir -p "$dest";

    inkscape "$f" --export-pdf="$dest/$name.pdf";
done;

exit 0;
