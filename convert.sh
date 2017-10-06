rm -rf ./unzipped
rm -rf ./unzipped_1yr
mkdir -p ./unzipped/basins
mkdir -p ./unzipped/counties
mkdir -p ./unzipped_1yr/basins
mkdir -p ./unzipped_1yr/counties
rm -rf ./output
mkdir ./output
mkdir ./output/datagrapher
for file in `find ./MAEEA_Data/counties -name '*.zip'`; do
  unzip -d './unzipped/counties' $file "*.ts5yr.csv" -x "__MACOSX*"
  unzip -d './unzipped_1yr/counties' $file "*.ts1yr.csv" -x "__MACOSX*"
done

for file in `find './MAEEA_Data/basins/' -name '*.ts5yr.*'`; do
  cp $file './unzipped/basins/'
done

for file in `find './MAEEA_Data/basins/' -name '*.ts1yr.*'`; do
  cp $file './unzipped_1yr/basins/'
done

node collect.js ./unzipped ./output ./unzipped_1yr
