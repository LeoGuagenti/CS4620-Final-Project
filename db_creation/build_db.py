# converts owid-co2-data.json into a sqlite3 database --> co2_data.db
# 
# [country_names]
# | country_name | *iso_code* |
# 
# [country_data] 
# | *iso_code* | year | co2 | co2_per_capita | share_global_co2 | cumulative_co2 | share_global_cumulative_co2 | population |

import json
import sqlite3

connection = sqlite3.connect('co2_data.db')
cursor = connection.cursor()

cursor.execute('create table country_names(country_name varchar unique, iso_code varchar primary key)')
cursor.execute('create table country_data(iso_code, year, co2, co2_per_capita, share_global_co2, cumulative_co2, share_global_cumulative_co2, population)')

file = open('owid-co2-data.json')
co2_data = json.load(file)

for entry in co2_data:
    country_name = entry
    country_data = co2_data[entry]

    try:
        iso_code = country_data['iso_code']
        data = country_data['data']
        
        try:
            for i in data:
                year = i['year']

                try: co2 = i['co2'] 
                except KeyError: co2=0.0

                try: co2_per_capita = i['co2_per_capita']
                except KeyError: co2_per_capita = 0.0

                try: share_global_co2 = i['share_global_co2']
                except KeyError: share_global_co2 = 0.0

                try: cumulative_co2 = i['cumulative_co2']
                except KeyError: cumulative_co2 = 0.0

                try: share_global_cumulative_co2 = i['share_global_cumulative_co2']
                except KeyError: share_global_cumulative_co2 = 0.0

                try: population = i['population']
                except KeyError: population = 0.0

                insert1 = "insert or ignore into country_names (country_name,iso_code) values ('" + country_name + "','" + iso_code + "')"
                insert2 = "insert into country_data (iso_code, year, co2, co2_per_capita, share_global_co2, cumulative_co2, share_global_cumulative_co2, population) values ('" + iso_code + "', " + str(year) + ", " + str(co2) + ", " + str(co2_per_capita) + ", " + str(share_global_co2) + ", " + str(cumulative_co2) + ", " + str(share_global_cumulative_co2) + ", " + str(population) + ")"

                cursor.execute(insert1)
                cursor.execute(insert2)
        except KeyError:
            print('error in loop')
    except KeyError:
        print(country_name, " does not have iso_code")

rows = cursor.execute('select * from country_data').fetchall()
for row in rows:
    print(row)

connection.commit()
connection.close()