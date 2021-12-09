const sqlite3 = require('sqlite3')
const express = require('express')
const bodyParser  = require('body-parser')

var db = new sqlite3.Database('co2_data.db')

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

//sanitizes user input to avoid manipulation
function sanitizeString(str){ return str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"").trim(); }

/**
 * Generates a query for a specified attribute and year for every country
 * @title title attribute data column (Total Co2 in Tons, Population...)
 * @attribute attribute being searched for in the db (co2, total_co2, population...)
 * @year when the data was collected
 * @res response object to send response to client
 */
async function worldQuery(title, attribute, year, res){
    var queryData = [['Country', title]]
    var queryExec = new Promise(async (resolve, reject) => {
        db.all(`select country_name,${attribute} from (country_data a join country_names b on a.iso_code=b.iso_code) where year=${year}`, (err, result) => {
            if(err){ throw err }
            
            result.forEach((value, index, array) => {
                if(value.country_name != 'World'){
                    queryData.push([value.country_name, value[attribute]]);
                }
                if (index === array.length -1) resolve();
            });
        })
    });
    queryExec.then(() => {
        res.send({data: queryData})
    }); 
}

/**
 * Generates a query for a specified attribute and year for specified countries
 * @title title attribute data column (Total Co2 in Tons, Population...)
 * @countries an array of country names
 * @attribute attribute being searched for in the db (co2, total_co2, population...)
 * @year when the data was collected
 * @res response object to send response to client
 */
async function countryQuery(title, countries, attribute, year, res){
    var data = [['Country', title]]
    var country_str = ""

    //builds country filter
    var buildStr = new Promise(async (resolve, reject) => {
        countries.forEach((country, index) => {
            country_str += `(year=${year} and country_name="${country}")`
            if(index === countries.length-1){ 
                resolve() 
            }else{
                country_str += " or "
            }
        })
    })
    buildStr.then(()=>{
        //query database for desired data
        var queryExec = new Promise(async (resolve, reject) => {
            db.all(`select country_name,${attribute} from (country_data a join country_names b on a.iso_code=b.iso_code) where (${country_str})`, (err, result) => {
                if(err){ throw err }
                result.forEach((value, index, array) => {
                    data.push([value.country_name, value[attribute]]);
                    if (index === array.length-1) resolve();
                });
            })
        })
        queryExec.then(() => {
            //send data back to client
            res.send({ data: data })
        })
    })
}

function isoQuery(res){
    var data = [['Country', 'iso_code']]

    var queryExec = new Promise(async (resolve, reject) => {
        db.all(`select * from country_names`, (err, result) => {
            if(err){ throw err }
            result.forEach((value, index, array) => {
                data.push([value.country_name, value.iso_code]);
                if (index === array.length-1) resolve();
            });
        })
    })
    queryExec.then(() => {
        //send data back to client
        res.send({ data: data })
    })
}

//on connection load main page
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
})

//generates queries based on user input and provides results to client
app.post('/', (req, res) => {
    //sanitize every input because predefined inputs can be faked
    const year = parseInt(sanitizeString(req.body.year), 10)
    const type = parseInt(sanitizeString(req.body.data_type))
    const countries = req.body.country_names
    if(year > 2019 || year < 1949){ res.sendStatus(500) }

    db.serialize(async () => {
        switch(type){
            case 0:
                countries[0] == 'World' ? 
                    worldQuery("CO2 Emissions (tons)", "co2", year, res) :
                    countryQuery("CO2 Emissions (tons)", countries, "co2", year, res)
                    break;
            case 1:
                countries[0] == 'World' ? 
                    worldQuery("Total Emissions (tons)", "cumulative_co2", year, res) :
                    countryQuery("Total Emissions (tons)", countries, "cumulative_co2", year, res)
                    break;
            case 2:
                countries[0] == 'World' ? 
                    worldQuery("CO2 Per Capita (tons)", "co2_per_capita", year, res) :
                    countryQuery("CO2 Per Capita (tons)", countries, "co2_per_capita", year, res)
                    break;
            case 3:
                countries[0] == 'World' ? 
                    worldQuery("Population", "population", year, res) :
                    countryQuery("Population", countries, "population", year, res)
                    break;
            case 4:
                isoQuery(res)
                break;
            default:
                console.log('Error: Data type does not exist')
        }
    })
})

app.listen(3000) //localhost:3000
