for type in "avgtemp" "consdrydays" "cooldegdays" "growdegdays" "heatdegdays" "maxtemp" "mintemp" "precip" "precipgt1" "precipgt2" "precipgt4" "tempgt100" "tempgt90" "tempgt95" "templt0" "templt32"; do
  echo $type
  wget https://adirondackatlas.org/api/v1/climatedeltas.php?parameter=$type -O ../nescaum-dataservices/data/ma/$type.json
done
