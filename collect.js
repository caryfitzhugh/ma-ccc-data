const glob = require( 'glob');
const _ = require('lodash');
const path = require('path');
const loader = require('csv-load-sync');
const setPath = require('object-path-set');
const fs = require('fs');

const input_path = process.argv[2];
const output_path = process.argv[3];
const input_path_yr1 = process.argv[4];

const file_map = {
    "temperature": {
      "TG": "tavg",
      "TX": "tmax",
      "TN": "tmin",
    },
    "degree_days": {
      "HD": "h", //Heading
      "CD": "c", // Cooling
      "GD": "g" // Growing
    },
    "above_temp_thresholds": {
      "TX90F" : "gt90",
      "TX95F" : "gt95",
      "TX100F" : "gt100",
    },
    "below_temp_thresholds": {
      "TN0F" : "lt0",
      "TN32F": "lt32",
    },
    "precipitation" : {
      "PRCPTOT": 'tot',
    },
    'consecutive_dry_days': {
      'CDD' : 'cdd',
    },
    "precip_events": {
      "R1in" : 'gt1in',
      "R2in" : 'gt2in',
      "R4in" : 'gt4in',
    }
  };

const datagrapher_seasons = {
  "annual": ["ANN", ""],
  "spring": ["MAM", "-05"],
  "summer": ["JJA", "-08"],
  "fall"  : ["SON", "-11"],
  "winter": ["DJF", "-02"]
};
const datagrapher_location_map = {
  "MA": "MA",
  "Essex": "25009",
  "Franklin": "25011",
  "Worcester": "25027",
  "Dukes": "25007",
  "Plymouth": "25023",
  "Hampshire": "25015",
  "Bristol": "25005",
  "Hampden": "25013",
  "Berkshire": "25003",
  "Middlesex": "25017",
  "Suffolk": "25025",
  "Barnstable": "25001",
  "Norfolk": "25021",
  "Nantucket": "25019",
  // Basins
  "Blackstone": "Blackstone",
  "Boston Harbor": "Boston Harbor",
  "Buzzards Bay": "Buzzards Bay",
  "Cape Cod": "Cape Cod",
  "Charles": "Charles",
  "Chicopee": "Chicopee",
  "Connecticut": "Connecticut",
  "Deerfield": "Deerfield",
  "Farmington": "Farmington",
  "French": "French",
  "Housatonic": "Housatonic",
  "Hudson":"Hudson",
  "Ipswich": "Ipswich",
  "Merrimack": "Merrimack",
  "Millers": "Millers",
  "Narragansett Bay & Mt. Hope Bay Shore": "Narragansett",
  "Nashua": "Nashua",
  "North Coastal": "North Coastal",
  "Parker": "Parker",
  "Quinebaug": "Quinebaug",
  "Shawsheen": "Shawsheen",
  "South Coastal": "South Coastal",
  "SuAsCo":"SuAsCo",
  "Taunton":"Taunton",
  "Ten Mile":"Ten Mile",
  "Westfield":"Westfield",
};
const datagrapher_files = () => {
  let all_files = [];
  let seasons = [ ["ANN", 'annual'],
                  ['MAM', 'spring'],
                  ['JJA', 'summer'],
                  ['SON', 'fall'],
                  ['DJF', 'winter'] ];
  let metrics = [ ['maxt', 'temperature', 'tmax'],
                  ['mint', 'temperature', 'tmin'],
                  ['avgt', 'temperature', 'tavg'],
                  ['pcpn', 'precipitation', 'tot'],
                  ['gdd50', 'degree_days', 'g'],
                  ['hdd65', 'degree_days', 'h'],
                  ['cdd65', 'degree_days', 'c'],
                  ['tx90', 'above_temp_thresholds', 'gt90'],
                  ['tx95', 'above_temp_thresholds', 'gt95'],
                  ['tx100', 'above_temp_thresholds', 'gt100'],
                  ['tn0', 'below_temp_thresholds', 'lt0'],
                  ['tn32', 'below_temp_thresholds', 'lt32'],
                  ['pcpn_1', 'precip_events', 'gt1in'],
                  ['pcpn_2', 'precip_events', 'gt2in'],
                  ['pcpn_4', 'precip_events', 'gt4in']
                ];
  metrics.forEach((metric) => {
    seasons.forEach((season) => {
      metrics.forEach((metric) => {
        all_files.push([1, `observed_${metric[0]}_${season[0]}`,
                          metric[1], ['obs'], season[1], metric[2]]);

        all_files.push([5, `projected_${metric[0]}_${season[0]}`,
                          metric[1], ['min','med','max'], season[1], metric[2]]);
      });
    });
  });

  return all_files;
};

const strip_years = (file, step) => {
  //let attr_path = [root, year, scenario, season, metric];
  let years = _.uniq(_.flatten(
    Object.keys(file).map(function(root) {
      return Object.keys(file[root]).map(function (yr) {
        return parseInt(yr,10);
      });
  })))
  let start_yr = Math.ceil(years[0] / (step * 1.0)) * step;

  let year_slices = _.filter(years, (yr) => { return ((yr - start_yr) % step === 0);});

  Object.keys(file).forEach((rkey) => {
    let root = file[rkey];
    // Look at all the keys - they are years.
    Object.keys(root).forEach((year) => {
      if (!year_slices.includes(parseInt(year, 10))) {
        delete root[year];
      }
    });
  });

  return file;
};

/* { Year: '2003.0',
  Barnstable: '24.670069885451468',
  Berkshire: '12.903046595333942',
  Bristol: '21.628777996068038',
  Dukes: '25.343828432487356',
  Essex: '19.481994458413567',
  Franklin: '11.607932650500796',
  Hampden: '15.53913563231831',
  Hampshire: '13.238128722646101',
  MA: '16.961086204639734',
  Middlesex: '17.320316593218831',
  Nantucket: '25.7542552870487',
  Norfolk: '19.988428144086217',
  Plymouth: '21.606508092244567',
  Suffolk: '22.242435717882255',
  Worcester: '14.916855632017549' }
  */

const reduce_file = (memo, metric, filename) => {
  //  TN.Annual.MED.ts5yr.csv
  let csv = loader(filename);
  let parts  = filename.split(".");
  let season = parts[1].toLowerCase();
  let scenario = parts[2].toLowerCase();

  return _.reduce(csv, (rmemo, row) => {
    let year = parseInt(row["Year"],10);
    delete row["Year"];

    Object.keys(row).forEach((key) => {
      let root = key;
      let value = parseFloat(parseFloat(row[key]).toFixed(3));

      if (!isNaN(value)) {
        let attr_path = [root, year, scenario, season, metric];
        setPath(rmemo, attr_path, value);
      }
    });
    return rmemo;
  }, memo)
};

const collect = (outfile, path_prefix, mappings) => {
  let result = {};
  // Start with each mapping
  Object.keys(mappings).forEach( (prefix) => {
    let metric = mappings[prefix];
    let dirpath = path.join(path_prefix,"**", `${prefix}.*.csv`);

    let files = glob.sync(dirpath);
    // Loop over each of these files
    //console.log(outfile, path_prefix, prefix, files, metric);
    files.forEach((map_file) => {
      reduce_file(result, metric, map_file);
    });
    //console.log(JSON.stringify(result));
  });
  return result;
};

let avg_data = Object.keys(file_map).reduce((memo, filename) => {
  memo[filename] = collect(filename, input_path, file_map[filename]);
  return memo;
}, {});

let yr_data = Object.keys(file_map).reduce((memo, filename) => {
  memo[filename] = collect(filename, input_path_yr1, file_map[filename]);
  return memo;
},{});


const writeout = (outfile, result) => {
  let output_filename = path.join(output_path, outfile +".json")
  stripped_result = strip_years(_.cloneDeep(result), 5);
  console.log('writing...', Object.keys(result));
  console.log(outfile);
  fs.writeFileSync(output_filename, JSON.stringify(stripped_result, null, 2));
  //console.log("JSON.stringify(result));
  //console.log(, outfile);
};

Object.keys(file_map).forEach((filename) => {
  writeout(filename, avg_data[filename]);
}, {});

//console.log(JSON.stringify(yr_data, null, 2));
// Now do conversion for Datagraher
datagrapher_files().forEach((file_spec) => {
  let type = file_spec[0];
  let filename = file_spec[1];
  let data_sel = file_spec[2];
  let source_sel = file_spec[3];
  let season_sel = file_spec[4];
  let season_spec = datagrapher_seasons[season_sel];
  let metric_sel = file_spec[5];
  let year_results = {};

  let data = null;
  if (type === 1) {
    data  = yr_data[data_sel];
  } else {
    data = avg_data[data_sel];
  }

  // Location
  Object.keys(data).forEach((location) => {
    let loc_data = data[location];
    Object.keys(loc_data).forEach((year) => {
      let metric_data = _.filter(source_sel.map((sel) => {
        let year_data = loc_data[year][sel];
        if (year_data) {
          let season_data = year_data[season_sel];
          if (season_data) {
            return season_data[metric_sel];
          } else {
            return 0;
          }
        }
        return null;
      }), function(v) { return !_.isNil(v); });

      if (metric_data.length > 0) {
        //console.log(year, location, datagrapher_location_map[location], metric_data);
        setPath(year_results, [year, datagrapher_location_map[location]], metric_data);
      }
    });
  });
  //console.log("Years:", Object.keys(year_results));
  let result = Object.keys(year_results).map((year) => {
    return [year, year_results[year]];
  });

  let output_filename = path.join(output_path, 'datagrapher', filename);
  fs.writeFileSync(output_filename, JSON.stringify({data: result}, null, 2));
  //console.log("wrote:", type, output_filename);
});
