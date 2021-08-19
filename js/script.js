const baseURL = "https://data.etabus.gov.hk/";
const defaultStops = [
    // 40X
    {
        'id': '9AD30F8EDBC3F139',
        'description': 'Wu Kai Sha Station',
        'bound': 'Westbound'
    },
    // 89D
    {
        'id': '541FF05FA053F2B5',
        'description': 'Wu Kai Sha Station',
        'bound': 'Westbound'
    },
    // 89S
    {
        'id': '7D54FE486D057070',
        'description': 'Wu Kai Sha Station',
        'bound': 'Westbound'
    },
    // 99
    {
        'id': '0CB1F7979192FBB2',
        'description': 'Wu Kai Sha Station',
        'bound': 'Eastbound'
    },
    {
        'id': '91CD1740B6AC752B',
        'description': 'Wu Kai Sha Station',
        'bound': 'Westbound'
    },
    //A41P
    {
        'id': 'BA72214DFE48AA86',
        'description': 'Wu Kai Sha Station',
        'bound': 'Westbound'
    }
]

function htmlToElements(html) {
    var template = document.createElement('template');
    template.innerHTML = html;
    return template.content.childNodes;
}

function convertDateToUTC(date) { 
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); 
}

class Eta {
    constructor() {}
    setGeneratedTime(t) {
        this.generated = new Date(t)
    }
    fromStopEta(o) {
        let route = new Route();
        route.fromStopEta(o);
        this.route = route;
        this.eta = new Date(o['eta']);
        this.eta_sequence = o['eta_seq'];
        this.remark_en = o['rmk_en'];
        this.remark_tc = o['rmk_tc'];
        this.lastUpdated = new Date(o['data_timestamp']);
        this.delta = convertDateToUTC(new Date(this.eta - new Date()));
        this.valid = this.eta > new Date();
    }
}

class Route {
    constructor() {}
    fromStopEta(o) {
        this.destination_en = o['dest_en'];
        this.destination_tc = o['dest_tc'];
        this.direction = o['dir'];
        this.route = o['route'];
        this.route_sequence = o['seq'];
    }
}

class Stop {
    constructor(stopId) {
        this.stopId = stopId;
        this.etas = [];
    }

    // gets eta of all routes passing through that stop
    async getEta() {
        let response = await fetch(baseURL+'v1/transport/kmb/stop-eta/'+this.stopId);
        this.response = await response.json()
        return this;
    }

    processEta() {
        for (const data of this.response.data) {
            let eta = new Eta()
            eta.setGeneratedTime(this.response.generated_timestamp)
            eta.fromStopEta(data)
            if (eta.route.destination_en.includes('WU KAI SHA')) continue;
            this.etas.push(eta)
        }
        this.etas.sort((a, b) => a.eta - b.eta)
        return this;
    }

    sortEta() {
        this.etas.sort((a, b) => a.eta - b.eta)
        return this;
    }

    updateInfo(tblNum) {
        let html = '';
        for (const data of this.etas) {
            if (data.valid) {
                let colour = data.remark_en == '' ? 'table-success' : 'table-secondary'
                html += `<tr class="${colour}">
                    <td>${data.route.route}</td>
                    <td>${data.route.destination_en}</td>
                    <td>${strftime('%H:%M:%S', data.eta)}</td>
                    <td>${strftime('%H:%M:%S', data.delta)}</td>
                    <td>${data.remark_en}</td>
                </tr>`;
            }
        }
        $(`#table${tblNum}`).html(html);
        $(`#generated${tblNum}`).html(strftime('%H:%M:%S', new Date()))
    }
}

// main code

function updateTimes() {
    Promise.all(
        defaultStops.map(stop => {
            let thisStop = new Stop(stop.id);
    
            return thisStop.getEta()
            .then(() => thisStop.processEta());
        })
    ).then(stops => {
        // all requests are done
        let allEtas = [];
        stops.map(stop => stop.etas.map(eta => {
            allEtas.push(eta)
        }))
        let newStop = new Stop('all');
        newStop.etas = allEtas;
        newStop.sortEta();
        newStop.updateInfo(1);
    }).then(() => {
        // update title and subtitle
        $(`#destination1`).html("Wu Kai Sha Station");
        $(`#bound1`).html("All bounds");
    })
}

updateTimes();
setInterval(updateTimes, 5000);