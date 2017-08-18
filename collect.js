const glob = require( 'glob');
const _ = require('lodash');
const path = require('path');
const loader = require('csv-load-sync');
const setPath = require('object-path-set');
const fs = require('fs');

const input_path = process.argv[2];
const output_path = process.argv[3];

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
    "precip_events": {
      "R1in" : 'gt1in',
      "R2in" : 'gt2in',
      "R4in" : 'gt4in',
    }
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

const collect = (outfile, mappings) => {
  let result = {};
  // Start with each mapping
  Object.keys(mappings).forEach( (prefix) => {
    let metric = mappings[prefix];
    let dirpath = path.join(input_path, `${prefix}.*.csv`);

    let files = glob.sync(dirpath);
    // Loop over each of these files
    files.forEach((map_file) => {
      reduce_file(result, metric, map_file);
    });
  });

  let output_filename = path.join(output_path, outfile +".json")
  result = strip_years(result, 5);
  fs.writeFileSync(output_filename, JSON.stringify(result, null, 2));
};

Object.keys(file_map).forEach((filename) => {
  collect(filename, file_map[filename]);
});
