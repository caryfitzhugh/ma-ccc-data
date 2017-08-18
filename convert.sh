rm -rf ./unzipped
mkdir ./unzipped
rm -rf ./output
mkdir ./output
for file in `find ./MAEEA_Data -name '*.zip'`; do
  echo $file
  unzip -d './unzipped' $file "*.ts5yr.csv" -x "__MACOSX*"
done

node collect.js ./unzipped ./output
