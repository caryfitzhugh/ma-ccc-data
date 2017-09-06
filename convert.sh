rm -rf ./unzipped
rm -rf ./unzipped_1yr
mkdir ./unzipped
mkdir ./unzipped_1yr
rm -rf ./output
mkdir ./output
mkdir ./output/datagrapher
for file in `find ./MAEEA_Data -name '*.zip'`; do
  echo $file
  unzip -d './unzipped' $file "*.ts5yr.csv" -x "__MACOSX*"
  unzip -d './unzipped_1yr' $file "*.ts1yr.csv" -x "__MACOSX*"
done

node collect.js ./unzipped ./output ./unzipped_1yr
