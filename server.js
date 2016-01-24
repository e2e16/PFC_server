// Load required packages
var controller = require('./controller');
var fs = require('fs');
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Producer = require('./models/producer.js');
var Consumer = require('./models/consumer.js');
var Message = require('./models/message.js');
var Category = require('./models/category.js');
var City = require('./models/city.js');

// Geocoding library config
var geocoderProvider = 'google';
var httpAdapter = 'http';
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter);

// Connect to e2e MongoDB
mongoose.connect('mongodb://localhost:27017/e2e');

// Promisification of mongoose
Promise.promisifyAll(mongoose);

// geocode Promise
function getGeoData(fullAddress) {
    return new Promise(function(resolve, reject) {
        geocoder.geocode(fullAddress, function (err, res) {
            if (err) {
                console.log('GEOCODER: api error');
                reject(err);
            }
            if (res) {
                console.log('GEOCODER: api success');
                resolve(res);
            }
        })
    });
}

// ================================ 
// ============ CONFIG ============  
// ================================ 

// Configuration vars
var categoryVersion;
var categoryList = [];
var protocolVersion;

// Auxiliary configuration management functions
function readConfigAttrib(jsonAttrib) {
    var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    if (!config[jsonAttrib]) {
        console.log('SYSTEM: ERROR the attribute does not exist in config file');
    } else {
        console.log('SYSTEM: Config file attribute '+jsonAttrib+': '+config[jsonAttrib]+' readed successfully');
        return config[jsonAttrib];
    }
}

function updateConfigAttrib(jsonAttrib, newValue) {
    var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    if (!config[jsonAttrib]) {
        console.log('SYSTEM: ERROR the attribute does not exist in config file');
    } else {
        config[jsonAttrib] = newValue;
        fs.writeFileSync('config.json', JSON.stringify(config, null, 1), 'utf8');
        console.log('SYSTEM: Config file attribute '+jsonAttrib+' updated successfully');
        console.log('SYSTEM: '+jsonAttrib+' : '+config[jsonAttrib]);
    }
}

function load_categories() {
    Category.find(function(err, cats) {
        if (err)
            console.log(err);

        var cat;
        for (cat in cats) {
            categoryList += [String(cat._id), cat.name];
        }
        console.log('SYSTEM: categoryList initialized');
    });
    
}

// Create Express application
var app = express();

// Use the body-parser package
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

// Use environment defined port or 3000
var port = process.env.PORT || 3000;

// Create Express router
var router = express.Router();

// Initial dummy route for testing
// http://localhost:3000/e2e
router.all('*', function(req, res, next) {
    if (req.is('json') && ((req.method === 'POST') || (req.method === 'PUT'))) {
        console.log('REQUEST: json format');
        next();
    } else if (!req.get('Content-Type') && ((req.method === 'GET') || (req.method === 'DELETE'))) {
        console.log('REQUEST: empty body');
        next();
    } else if (!req.get('Content-Type') && (req.method === 'HEAD')) {
        console.log('REQUEST: checking if server is alive');
        next()
    } else {
        console.log('REQUEST: not a valid format');
        res.statusCode = 406;
        res.json({ message: 'ERROR: not a valid format. This API just accepts json formatted content-type'})
    }
});

router.head('/', function(req, res) {
    res.json({ message: 'Hi from Mars!'});
});

// ============================== 
// ============ CITY ============  
// ============================== 

// Create a new route with the prefix /cities
var citiesRoute = router.route('/cities');
var cityRoute = router.route('/cities/:city_id');

// ========== POST ==========

// Create endpoint /e2e/cities for POST
citiesRoute.post(function(req, res) {
    console.log('POST.CITY: Starting POST method to create a new City');
    // Create a new instance of the City model
    var city = new City();

    // Set the city properties that came from the POST data
    City.findOne({ 'name': req.body.name.toLowerCase() }, function (err, cit) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cit) {
            console.log('POST.CITY: City does not exist in the database');
            city.name = req.body.name;

            // Save the city and check for errors
            city.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }
                
                console.log('POST.CITY: City saved successfully');
                res.statusCode = 201;
                res.json({ message: 'POST: Ciudad creada correctamente', data: city });
            });
        } else {
            console.log('POST.CITY: ERROR City already exists in the database');
            res.statusCode = 409;
            res.json({ message: 'ERROR: Ciudad ya existente en la base de datos', data: req.body.name });
        }
    });
});

// =========== GET ===========

// Create endpoint /e2e/cities for GET
citiesRoute.get(function(req, res) {

    City.find(function(err, cits) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        console.log('GET.CITY: all Cities retrieved succesfully');
        res.statusCode = 200;
        res.json(cits);
    });
});

// Create endpoint /e2e/cities/:city_id for GET
cityRoute.get(function(req, res) {

    City.findById(req.params.city_id, function(err, cit) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cit) {
            console.log('GET.CITY: ERROR City does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Ciudad no existe en la base de datos', data: req.params.city_id });
        } else {
            console.log('GET.CITY: City found');
            res.statusCode = 200;
            res.json(cit);
        }
    });
});

// ========== DELETE ==========

// Create endpoint /e2e/cities/:city_id for DELETE
cityRoute.delete(function(req, res) {

    City.findById(req.params.city_id, function (err, cit) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cit) {
            console.log('DELETE.CITY: ERROR City does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Ciudad no existe en la base de datos', data: req.params.city_id });
        } else {
            cit.remove(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('DELETE.CITY: City deleted succesfully');
                res.statusCode = 200;
                res.json({ message: 'DELETE: Ciudad eliminada correctamente', data: cit });
            });
        }
    });
});

// ========== PUT ==========

// Create endpoint /e2e/cities for PUT
cityRoute.put(function(req, res) {

    City.findById(req.params.city_id, function(err, cit) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cit) {
            console.log('PUT.CITY: ERROR City does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Ciudad no existe en la base de datos', data: req.params.city_id });
        } else {
            cit.name = req.body.name;
            cit.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('PUT.CITY: City updated successfully');
                res.statusCode = 200;
                res.json({ message: 'PUT: Ciudad actualizada correctamente', data: cit });
            });
        }
    });

});

// ============================== 
// ========== CATEGORY ==========  
// ============================== 

// Create a new route with the prefix /categories
var categoriesRoute = router.route('/categories');
var categoryRoute = router.route('categories/:category_id');

// ========== POST ==========

// Create endpoint /e2e/categories for POSTS
categoriesRoute.post(function(req, res) {
    console.log('POST.CATEGORY: Starting POST method to create a new Category');
    // Create a new instance of the Category model
    var category = new Category();

    // Set the category properties that came from the POST data
    Category.findOne({ 'name': req.body.name.toLowerCase() }, function (err, cat) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cat) {
            console.log('POST.CATEGORY: Category does not exist in the database');
            category.name = req.body.name;

            // Save the category and check for errors
            category.save(function(err) {
                if (err)
                    console.log(err);

                categoryVersion++;
                updateConfigAttrib('category_version', categoryVersion);
                console.log('POST.CATEGORY: Category saved successfully');
                load_categories();
                res.statusCode = 201;
                res.json({ message: 'POST: Categoria añadida correctamente', data: category });
            });
        } else {
            console.log('POST.CATEGORY: ERROR Category already exists in the database');
            res.statusCode = 409;
            res.json({ message: 'ERROR: Categoría ya existente en la base de datos', data: req.body.name });
        }
    });

});

// =========== GET ===========

// Create endpoint /e2e/categories for GET
categoriesRoute.get(function(req, res) {

    Category.find(function(err, cats) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        console.log('GET.CATEGORY: all Categories retrieved successfully');
        res.statusCode = 200;
        res.json(cats);
    });
});

// Create endpoint /e2e/categories/:category_id for GET
categoryRoute.get(function(req, res) {

    Category.findById(req.params.category_id, function(err, cat) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cat) {
            console.log('GET.CATEGORY: ERROR Category does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Categoría no existe en la base de datos', data: req.params.category_id });
        } else {
            console.log('GET.CATEGORY: Category found');
            res.statusCode = 200;
            res.json(cat);
        }

    });
});

// ========== DELETE ==========

// Create endpoint /e2e/categories/:category_id for DELETE
categoryRoute.delete(function(req, res) {

    Category.findById(req.params.category_id, function (err, cat) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cat) {
            console.log('DELETE.CATEGORY: ERROR Category does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Categoría no existe en la base de datos', data: req.params.category_id });
        } else {
            cat.remove(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }
            
                categoryVersion--;
                updateConfigAttrib('category_version', categoryVersion);
                console.log('DELETE.CATEGORY: Category deleted succesfully');
                load_categories();
                res.statusCode = 200;
                res.json({ message: 'DELETE: Categoría eliminada correctamente', data: cat });
            });
        }

    });

});

// ========== PUT ==========

// Create endpoint /e2e/categories/:category_id for PUT
categoryRoute.put(function(req, res) {

    Category.findById(req.params.category_id, function (err, cat) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cat) {
            console.log('PUT.CATEGORY: ERROR Category does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Categoría no existe en la base de datos', data: req.params.category_id });
        } else {
            cat.name = req.body.name;
            cat.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }


                categoryVersion += 0.1;
                updateConfigAttrib('category_version', categoryVersion);
                console.log('PUT.CATEGORY: Category updated successfully');
                load_categories();
                res.statusCode = 200;
                res.json({ message: 'PUT: Categoría actualizada correctamente', data: cat });
            });
        }
    });

});

// ============================== 
// ========== PRODUCER ==========  
// ============================== 

// Create a new route with the prefix /producers
var producersRoute = router.route('/producers');
var producerRoute = router.route('/producers/:producer_id');

// ========== POST ==========

// Create endpoint /e2e/producers for POSTS
producersRoute.post(function(req, res) {
    console.log('POST.PRODUCER: Starting POST method to create a new Producer');
    // Create a new instance of the Producer model
    var producer = new Producer();

    // Set the producer properties that came from the POST data
    Producer.findOne({ 'name': req.body.name.toLowerCase(), 'contact.phone': req.body.contact.phone }, function (err, prod) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!prod) {
            console.log('POST.PRODUCER: Producer does not exist in the database');

            // ========== NAME & CATEGORY ==========
            producer.name = req.body.name;
            // ========== ADDRESS ==========
            producer.address.street = req.body.address.street;
            // ========== GEOLOCATION ==========
            // ========== CONTACT ==========
            producer.contact.phone = req.body.contact.phone;
            producer.contact.email= req.body.contact.email;
            producer.contact.web = req.body.contact.web;

            // ========== LIMITS ==========
            producer.limit.week = 0;
            producer.limit.month = 0;

            // promises for City and Category
            Promise.props({
                cat: Category.findById(req.body.cat_id).execAsync(),
                cit: City.findById(req.body.address.cit_id).execAsync()
            })
            .then(function(results) {
                if (!results.cat) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la Categoría no existe en la base de datos. No puede añadirse un Productor sin una categoría válida', data: req.body.cat_id });
                    throw new Error('POST.PRODUCER: ERROR Producer does not have a valid category');
                } else {
                    console.log('POST.PRODUCER: Producer has a valid category');
                    producer.category = results.cat.name;
                }

                if (!results.cit) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la Ciudad no existe en la base de datos. No puede añadirse un Productor sin una ciudad válida', data: req.body.address.cit_id });
                    throw new Error('POST.PRODUCER: ERROR Producer does not have a valid city');
                } else {
                        console.log('POST.PRODUCER: Producer has a valid city');
                        producer.address.city = results.cit.name;
                }

                var fullAddress = producer.address.street + ', ' + producer.address.city + ', ' + 'España';
                // return a Promise
                return getGeoData(fullAddress);
            })
            .then(function(geoData) {
                // console.log(geoData);
                if ((geoData.length === 0) || (!geoData[0].streetName)) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la dirección del Productor no es válida. No puede añadirse un productor sin una dirección válida. Por favor, revise el formato de la dirección: e.g. Avenida Complutense 30 ', data: req.body.address.street });
                    throw new Error('POST.PRODUCER: ERROR Producer address can not be geocoded');
                } else {
                    producer.geo.longitude = geoData[0].longitude;
                    producer.geo.latitude = geoData[0].latitude;
                    console.log('POST.PRODUCER: Producer address geocoded successfully');
                }

                return producer.save();
            })
            .then(function(produ) {
                console.log('POST.PRODUCER: Producer saved successfully');
                res.statusCode = 201;
                res.json({ message: 'POST: Productor creado correctamente', data: produ });
            })
            .catch(function(err) {
                console.log(err);
                res.statusCode = 500;
                res.send('Internal Error');

            });

        } else {
            res.statusCode = 409;
            res.json({ message: 'ERROR: Productor ya existente en la base de datos', data: req.body.name });
            console.log('POST.PRODUCER: ERROR Producer already exists in the database');
        }
    });
});

// ========== GET ==========

// Create endpoint /e2e/producers for GET
producersRoute.get(function(req, res) {

    Producer.find(function(err, prods) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        console.log('GET.PRODUCER: all Producers retrieved successfully');
        res.statusCode = 200;
        res.json(prods);
    });
});

// Create endpoint /e2e/producers/:producer_id for GET
producerRoute.get(function(req, res) {
    
    Producer.findById(req.params.producer_id, function(err, prod) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!prod) {
            console.log('GET.PRODUCER: ERROR Producer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Productor no existe en la base de datos', data: req.params.producer_id});
        } else {
            console.log('GET.PRODUCER: Producer found');
            res.statusCode = 200;
            res.json(prod);
        }

    });
});

var catprodRoute = router.route('/categories/:category_id/producers');

catprodRoute.get(function(req, res) {
    
    var catPromise = Category.findById(req.param.category_id).execAsync();
    catPromise.then(function(cat) {
        if (!cat) {
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Categoría a buscar no existe en la base de datos', data: req.params.category_id });
            throw new Error('GET.PRODUCER: ERROR can not find a valid Category to search');
        } else {
            console.log('GET.PRODUCER: valid Category to perform a search');
            return Producer.find({ category: cat.name }).execAsync();
        }
    })
    .then(function(prodlist) {
       res.statusCode = 200;
       res.json(prodlist);
    })
    .catch(function(err) {
        console.log(err);
    });

});

// ========== DELETE ==========

// Create endpoint /e2e/producers/:producer_id for DELETE
producerRoute.delete(function(req, res) {

    Producer.findById(req.params.producer_id, function (err, prod) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!prod) {
            console.log('DELETE.PRODUCER: ERROR Producer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Productor no existe en la base de datos', data: req.params.proucer_id });
        } else {
            prod.remove(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('DELETE.PRODUCER: Producer deleted successfully');
                res.statusCode = 200;
                res.json({ message: 'DELETE: Productor eliminado correctamente', data: prod });
            });
        }
    });
});

// ========== PUT ==========

// Create endpoint /e2e/producers/:producer_id for PUT
producerRoute.put(function(req, res) {

    Producer.findById(req.params.producer_id, function (err, prod) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!prod) {
            console.log('PUT.PRODUCER: ERROR Producer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Productor no existe en la base de datos', data: req.params.producer_id });

        } else {

            // ========== NAME & CATEGORY ==========
            prod.name = req.body.name;
            // ========== ADDRESS ==========
            prod.address.street = req.body.address.street;
            // ========== GEOLOCATION ==========
            // ========== CONTACT ==========
            prod.contact.phone = req.body.contact.phone;
            prod.contact.email= req.body.contact.email;
            prod.contact.web = req.body.contact.web;

            // ========== LIMITS ==========
            prod.limit.week = 0;
            prod.limit.month = 0;

            // promises for City and Category
            Promise.props({
                cat: Category.findById(req.body.cat_id).execAsync(),
                cit: City.findById(req.body.address.cit_id).execAsync()
            })
            .then(function(results) {
                if (!results.cat) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la Categoría no existe en la base de datos. No puede añadirse un Productor sin una categoría válida', data: req.body.cat_id });
                    throw new Error('PUT.PRODUCER: ERROR Producer does not have a valid category');
                } else {
                    console.log('PUT.PRODUCER: Producer has a valid category');
                    prod.category = results.cat.name;
                }

                if (!results.cit) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la Ciudad no existe en la base de datos. No puede añadirse un Productor sin una ciudad válida', data: req.body.address.cit_id });
                    throw new Error('PUT.PRODUCER: ERROR Producer does not have a valid city');
                } else {
                        console.log('PUT.PRODUCER: Producer has a valid city');
                        prod.address.city = results.cit.name;
                }

                var fullAddress = prod.address.street + ', ' + prod.address.city + ', ' + 'España';
                // return a Promise
                return getGeoData(fullAddress);
            })
            .then(function(geoData) {
                // console.log(geoData);
                if ((geoData.length === 0) || (!geoData[0].streetName)) {
                    res.statusCode = 404;
                    res.json({ message: 'ERROR: la dirección del Productor no es válida. No puede añadirse un productor sin una dirección válida. Por favor, revise el formato de la dirección: e.g. Avenida Complutense 30 ', data: req.body.address.street });
                    throw new Error('PUT.PRODUCER: ERROR Producer address can not be geocoded');
                } else {
                    prod.geo.longitude = geoData[0].longitude;
                    prod.geo.latitude = geoData[0].latitude;
                    console.log('PUT.PRODUCER: Producer address geocoded successfully');
                }

                return prod.save();
            })
            .then(function(produ) {
                console.log('PUT.PRODUCER: Producer saved successfully');
                res.statusCode = 201;
                res.json({ message: 'PUT: Productor actualizado correctamente', data: produ });
            })
            .catch(function(err) {
                console.log(err);
            });
        }
    });
});


// ============================== 
// ========== CONSUMER ==========  
// ============================== 

// Create a new route with the prefix /consumers
var consumersRoute = router.route('/consumers');
var consumerRoute = router.route('/consumers/:consumer_id');
var consumerLocRoute = router.route('/consumers/:consumer_id/location')
var consumerNotSubsRoute = router.route('/consumers/:consumer_id/subscription')

// ========== POST ==========

// Create endpoint /e2e/consumers for POST
consumersRoute.post(function(req, res) {
    console.log('POST.CONSUMER: Starting POST method to create a new Consumer');
    //Create a new instance of the Consumer model
    var consumer = new Consumer();

    // Set the consumer properties that came from the POST data
    Consumer.findOne({ 'token': req.body.token.toLowerCase() }, function (err, cons) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!cons) {
            console.log('POST.CONSUMER: Consumer does not exist in the database');
            consumer.token = req.body.token;
            consumer.notifications.notitype = req.body.notifications.notitype;
            consumer.notifications.roaming = req.body.notifications.roaming;
            consumer.location.longitude = req.body.location.longitude;
            consumer.location.latitude = req.body.location.latitude;
            consumer.subscriptions = req.body.subscriptions;
            consumer.blocked = req.body.blocked;

            // Save the consumer and check for errors
            consumer.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('POST.CONSUMER: Consumer created successfully');
                res.statusCode = 201;
                res.json({ message: 'POST: Consumidor creado correctamente', data: consumer });
            });
        } else {
            console.log('POST.CONSUMER: ERROR Consumer already exists in the database');
            res.statusCode = 409;
            res.json({ message: 'ERROR: Consumidor ya existente en la base de datos' });
        }
    });

});

// ========== GET ==========

// Create endpoint /e2e/consumers for GET
consumersRoute.get(function(req, res) {

    Consumer.find(function(err, cons) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        console.log('GET.CONSUMER: all Consumers retrieved successfully');
        res.statusCode = 200;
        res.json(cons);
    });
});

// Create endpoint /e2e/consumers/:consumer_id for GET
consumerRoute.get(function(req, res) {

    Consumer.findById(req.params.consumer_id, function(err, con) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!con) {
            console.log('GET.CONSUMER: ERROR Consumer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Consumidor no existe en la base de datos', data: req.params.consumer_id });
        } else {
            console.log('GET.CONSUMER: Consumer found');
            res.statusCode = 200;
            res.json(con);
        }
    });
});


// ========== DELETE ==========

// Create endpoint /e2e/consumers for DELETE
consumerRoute.delete(function(req, res) {

    Consumer.findById(req.params.consumer_id, function (err, con) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!con) {
            console.log('DELETE.CONSUMER: ERROR Consumer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Consumidor no existe en la base de datos', data: req.params.consumer_id });
        } else {
            con.remove(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('DELETE.CONSUMER: Consumer deleted successfully');
                res.statusCode = 200;
                res.json({ message: 'DELETE: Consumidor eliminado correctamente', data: con });
            });
        }       
    });
});

// ========== PUT ==========

// Create endpoint /e2e/consumers for PUT
consumerRoute.put(function(req, res) {

    Consumer.findById(req.params.consumer_id, function(err, con) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!con) {
            console.log('PUT.CONSUMER: ERROR Consumer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Consumidor no existe en la base de datos', data: req.params.consumer_id });
        } else {
            con.token = req.body.token;
            con.notifications.notitype = req.body.notifications.notitype;
            con.notifications.roaming = req.body.notifications.roaming;
            con.location.longitude = req.body.location.longitude;
            con.location.latitude = req.body.location.latitude;
            con.subscriptions = req.body.subscriptions;
            con.blocked = req.body.req;

            con.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('PUT.CONSUMER: Consumer updated successfully');
                res.statusCode = 200;
                res.json({ message: 'PUT: Consumidor actualizado correctamente', data: con });
            });
        }
    });
});

// Create endpoint /e2e/consumers/:token/location for PUT
consumerLocRoute.put(function(req, res) {

    Consumer.findById(req.params.consumer_id, function(err, con) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!con) {
            console.log('PUT.CONSUMER: ERROR Consumer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Consumidor no existe en la base de datos', data: req.params.consumer_id });
        } else {
            con.location.longitude = req.body.location.longitude;
            con.location.latitude = req.body.location.latitude;

            con.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('PUT.CONSUMER: Consumer updated successfully');
                res.statusCode = 200;
                res.json({ message: 'PUT: Consumidor actualizado correctamente', data: con });
            });
        }
    });
});

// Create endpoint /e2e/consumers/:consumer_id/subscription for PUT
consumerNotSubsRoute.put(function(req, res) {

    Consumer.findById(req.params.consumer_id, function(err, con) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!con) {
            console.log('PUT.CONSUMER: ERROR Consumer does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Consumidor no existe en la base de datos', data: req.params.consumer_id });
        } else {
            con.notifications.notitype = req.body.notifications.notitype;
            con.notifications.roaming = req.body.notifications.roaming;
            con.subscriptions = req.body.subscriptions;
            // con.blocked = req.body.req;

            con.save(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('PUT.CONSUMER: Consumer updated successfully');
                res.statusCode = 200;
                res.json({ message: 'PUT: Consumidor actualizado correctamente', data: con });
            });
        }
    });
});

// ============================== 
// ========== MESSAGES ==========  
// ============================== 

// Create a new route with the prefix /messages
var messagesRoute = router.route('/messages');
var messageRoute = router.route('/messages/:message_id');

// ========== POST ==========

// Create endpoint /e2e/messages for POST
messagesRoute.post(function(req, res) {
    console.log('POST.MESSAGE: Starting POST method to create a new Message');
    // Create a new instance of the Message model
    var message = new Message();

    // Set the messages properties that came from the POST data
    message.aps.alert = req.body.aps.alert;
    message.content.body = req.body.content.body;
    message.content.deadline = req.body.content.deadline;
    
    var producerPromise = Producer.findById(req.body.prod_id).execAsync();
    producerPromise.then(function(prod) {
        if (!prod) {
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Productor del mensaje no existe en la base de datos. No puede añadirse un nuevo mensaje sin un productor válido', data: req.body.prod_id });
            throw new Error('POST.MESSAGE: ERROR Message does not have a valid producer');
        } else {
            console.log('POST.MESSAGE: Message has a valid producer');
            message.producer.pid = prod._id;
            message.producer.name = prod.name;
            message.producer.category = prod.category;
            message.producer.address.street = prod.address.street;
            message.producer.address.city = prod.address.city;
            message.producer.geo.longitude = prod.geo.longitude;
            message.producer.geo.latitude = prod.geo.latitude;
            message.producer.contact.phone = prod.contact.phone;
            message.producer.contact.email = prod.contact.email;
            message.producer.contact.web = prod.contact.web;
            message.cat.version = categoryVersion;
            message.protocol.version = protocolVersion;
        }

        return message.save();
    })
    .then(function(mess) {
        console.log('POST.MESSAGE: Message saved successfully');
        res.statusCode = 201;
        res.json({ message: 'POST: Mensaje creado correctamente', data: mess});
        controller.messagePostAction(mess)
    })
    .catch(function(err) {
        console.log(err);
    });
});

// =========== GET ===========

// Create endpoint /e2e/messages for GET
var catmessRoute = router.route('/categories/:category_id/messages');

catmessRoute.get(function(req, res) {
    
    var catPromise = Category.findById(req.params.category_id).execAsync();
    catPromise.then(function(cat) {
        if (!cat) {
            res.statusCode = 404;
            res.json({ message: 'ERROR: la Categoría a buscar no existe en la base de datos', data: req.params.category_id });
            throw new Error('GET.MESSAGE: ERROR can not find a valid Category to search');
        } else {
            console.log('GET.MESSAGE: valid Category to perform a search');
            return Message.find({ 'producer.category': cat.name }).execAsync();
        }
    })
    .then(function(messlist) {
       res.statusCode = 200;
       res.json(messlist);
    })
    .catch(function(err) {
        console.log(err);
    });

});

// =========== DELETE ===========

// Create endpoint /e2e/messages/:message_id for DELETE
messageRoute.delete(function(req, res) {
    
    Message.findById(req.params.message_id, function(err, mess) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!mess) {
            console.log('DELETE.MESSAGE: ERROR Message does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Mensaje no existe en la base de datos ', data: req.params.message_id });
        } else {
            mess.remove(function(err) {
                if (err) {
                    console.log(err);
                    res.statusCode = 500;
                    res.send('Internal Error');
                }

                console.log('DELETE.MESSAGE: Message deleted succesfully');
                res.statusCode = 200;
                res.json({ message: 'DELETE: Mensaje eliminado correctamente', data: mess });
            });
        }
    });
});

// ========== PUT ==========

// Create endpoint /e2e/messages for PUT
messageRoute.put(function(req, res) {

    Message.findById(req.params.message_id, function(err, mess) {
        if (err) {
            console.log(err);
            res.statusCode = 500;
            res.send('Internal Error');
        }

        if (!mess) {
            console.log('PUT.MESSAGE: ERROR Message does not exist');
            res.statusCode = 404;
            res.json({ message: 'ERROR: el Mensaje no existe en la base de datos', data: req.params.message_id });
        } else {
            mess.aps.alert = req.body.aps.alert;
            mess.content.body = req.body.content.body;
            mess.content.deadline = req.body.content.deadline;
            
            var producerPromise = Producer.findById(req.body.prod_id).execAsync();
            producerPromise.then(function(prod) {
                if (!prod) {
                    res.statusCode = 404;
                    res.json({ mess: 'ERROR: el Productor del mensaje no existe en la base de datos. No puede actualizarse un mensaje sin un productor válido', data: req.body.prod_id });
                    throw new Error('PUT.MESSAGE: ERROR Message does not have a valid producer');
                } else {
                    console.log('PUT.MESSAGE: Message has a valid producer');
                    message.producer.pid = prod._id;
                    mess.producer.name = prod.name;
                    mess.producer.category = prod.category;
                    mess.producer.address.street = prod.address.street;
                    mess.producer.address.city = prod.address.city;
                    mess.producer.geo.longitude = prod.geo.longitude;
                    mess.producer.geo.latitude = prod.geo.latitude;
                    mess.producer.contact.phone = prod.contact.phone;
                    mess.producer.contact.email = prod.contact.email;
                    mess.producer.contact.web = prod.contact.web;
                    mess.cat.version = categoryVersion;
                    mess.protocol.version = protocolVersion;
                }

                return mess.save();
            })
            .then(function(mess) {
                console.log('PUT.MESSAGE: Message updated successfully');
                res.statusCode = 201;
                res.json({ mess: 'POST: Mensaje actualizado correctamente', data: mess});
            })
            .catch(function(err) {
                console.log(err);
            });
        }
            });
});

// ================================== 
// ========== INITIALIZING ==========  
// ================================== 

// Register all our routes with /e2e
app.use('/e2e', router);

// Initial Configuration
function init_config() {
    categoryVersion = readConfigAttrib('category_version');
    protocolVersion = readConfigAttrib('protocol_version');
    load_categories();
    console.log('SYSTEM: system configuration variables initialized');
    console.log('SYSTEM: categoryVersion '+categoryVersion);
    console.log('SYSTEM: protocolVersion '+protocolVersion);
}

// Default Categories
function init_categories() {
    Category.count({}, function(err, count) {
        if (err)
            console.log(err);

        if (count !== 0) {
            console.log('SYSTEM: database already initilized with %d categories', count);    
            console.log('NOTE: If you want to initilize categories with default values, please delete all current entries and restart the server');
            return;
        } else {
            var catDefaultArray = [
                                    { 'name': 'información pública' },
                                    { 'name': 'tiempo' },
                                    { 'name': 'tráfico' },
                                    { 'name': 'alimentación' },
                                    { 'name': 'automoción' },
                                    { 'name': 'bricolaje y jardinería' },
                                    { 'name': 'copas' },
                                    { 'name': 'cultura' },
                                    { 'name': 'hogar y jardín' },
                                    { 'name': 'librería y papelería' },
                                    { 'name': 'restaurantes' },
                                    { 'name': 'ropa' },
                                    { 'name': 'salud y belleza' },
                                    { 'name': 'tecnología' },
                                    { 'name': 'plantas' }
            ];
            
            Category.collection.insert(catDefaultArray, function (err, docs) {
                if (err)
                    console.log(err);

                console.log(catDefaultArray);
                console.log('SYSTEM: %d default categories were successfully inserted.', docs.insertedCount);
            });
        }
    });
}

init_categories();
init_config();

// Start the server
app.listen(port);
console.log('Connected at port ' + port);

