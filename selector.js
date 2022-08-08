const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
// Get the value of "some_key" in eg "https://example.com/?some_key=some_value"

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const bgColors = [
    "#e6e6ff",
    "#fff2e6",
    "#f5e6ff",
    "#f2ffe6",
    "#f9ecec",
];

const date_proxy = document.createElement("input");
date_proxy.type = "date";
const format_date = function(date_object){
    date_proxy.valueAsDate = date_object;
    return date_proxy.value;
}

let need_update = false;
const na = d3e => {
    d3e.classed("na", true);
}
const unna = d3e => {
    d3e.classed("na",false);
}

const na_parent = d3e => {
    d3.select(d3e.node().parentNode).classed("na",true);    
}
const unna_parent = d3e => {
    d3.select(d3e.node().parentNode).classed("na",false);    
}


document.addEventListener("DOMContentLoaded",()=>{
    const update_map = {};
    const by_code = {};
    const groups = {};
    const groupmap = {};
    d3.csv("./scheduling-info.csv", d => {
        d.start_offset = +d.start_offset;
        d.end_offset = +d.end_offset;
        d.fixed_interval = +d.fixed_interval;
        d.fixed_interval = d.fixed_interval === 1;
        const start_cause = update_map[d.start_base_event] || {};
        const end_cause = update_map[d.end_base_event] || {};
        update_map[d.start_base_event] = start_cause;
        update_map[d.end_base_event] = end_cause;
        start_cause[d.code] = true;
        end_cause[d.code] = true;
        by_code[d.code] = d;
        const group_key = d.start_base_event + '_' + d.end_base_event;
        group = groups[group_key] || [];
        groups[group_key] = group;
        group.push(d.code);
        return d;
    }).then(data => {
        let color_i = 0;
        Object.keys(groups).forEach(g => {
            const color = bgColors[color_i];
            color_i = (color_i + 1) % bgColors.length;
            groups[g].forEach(c => {
                groupmap[c] = color;
            });
        });
        
        const rows = d3
              .select("#tbl")
              .selectAll("tr")
              .data(data)
              .join("tr")
              .style("background", d => groupmap[d.code])
              .attr("class", d=> !d.fixed_interval ? "bordered" : "unbordered")
              .html(d => {
                  if(!d.fixed_interval){
                      return `<td>${d.description}</td><td id="${d.code}_from"></td><td><input id="${d.code}" type="date" updateable></input></td><td id="${d.code}_to"></td><td>${d.window_description}</td>`;
                  } else {
                      return `<td>${d.description}</td><td id="${d.code}_from"><td class="na"><span id="${d.code}" fixed_interval updateable> → </span></td><td id="${d.code}_to"></td><td>${d.window_description}</td>`;
                  }
              });
        d3.selectAll("input").each(function(){
            const el = this;
            if(params[el.id]){
                el.value = params[el.id];
            }
        })
        d3.select("#tbl").insert("tr",":first-child").html("<td>Event</td><td>Earliest</td><td>Date</td><td>Latest</td><td>Time Window</td>")
        const input_has_value = id => d3.select(`#${id}`).property("value") !== "";
        const input_value_as_date = id => d3.select(`#${id}`).node().valueAsDate;
        const input_date_shifted_days = (id,days) => d3.select(`#${id}`).node().valueAsDate.addDays(days);
        const update_url = function(){
            const parts = [];
            d3.selectAll("input").each(function() {
                const code = d3.select(this).attr("id");
                const val = d3.select(this).node().value;
                if(val !== null){
                    parts.push(`${code}=${val}`);
                }
            });
            d3.select("#save").attr("href",`./select.html?${parts.join("&")}`);
        }
        const update_inputs = function(){
            d3.selectAll("input").on("input",null);
            d3
            .selectAll("input")
            .property("disabled", function(d){
                const e = d3.select(this);
                const n = e.node();
                const id = e.attr("id");
                const info = by_code[id];
                console.log(id);
                if(info.start_base_event === "" && info.end_base_event === ""){
                    console.log(`${id}: no parents`);
                    na(d3.select(`#${id}_from`).html("〜"));
                    na(d3.select(`#${id}_to`).html("〜"));
                    return false;
                } else {
                    let parents_filled_in = true;
                    [info.start_base_event, info.end_base_event]
                        .forEach(event_name => {
                            if(input_has_value(event_name)){
                                console.log(`${event_name} parent of ${id} has value`)
                                parents_filled_in = true;
                            } else {
                                console.log(`${event_name} parent of ${id} has no value`)
                                parents_filled_in = false;
                            }
                        });
                    console.log(`${id}: parents (${[info.start_base_event, info.end_base_event]}) filled in: ${parents_filled_in}`)
                    if(parents_filled_in){
                        const start = input_date_shifted_days(info.start_base_event, info.start_offset);
                        const end = input_date_shifted_days(info.end_base_event, info.end_offset);                        
                        const cd = n.valueAsDate;
                        n.valueAsDate = start;
                        const start_txt = n.value;
                        n.valueAsDate = end;
                        const end_txt = n.value;
                        n.min = start_txt;
                        n.max = end_txt;
                        unna(d3.select(`#${id}_from`).html(start_txt))
                        unna(d3.select(`#${id}_to`).html(end_txt))
                        if(cd && cd >= start && cd <= end){
                            n.valueAsDate = cd;
                        } else {
                            n.valueAsDate = start;
                        }
                        return false;
                    } else {
                        n.value = null;
                        return true;
                    }
                }
            })
            d3.selectAll("input").on("input", () => need_update = true);
        }
        const update_intervals = function(){
            d3.selectAll("span[fixed_interval]")
                .each(function(){
                    const e = d3.select(this);
                    const n = e.node();
                    const id = e.attr("id");
                    const info = by_code[id];
                    if(info.start_base_event === "" && info.end_base_event === ""){
                        return false;
                    } else {
                        let parents_filled_in = true;
                        [info.start_base_event, info.end_base_event]
                            .forEach(event_name => {
                                if(input_has_value(event_name)){
                                    console.log(`${event_name} parent of ${id} has value`)
                                    parents_filled_in = true;
                                } else {
                                    console.log(`${event_name} parent of ${id} has no value`)
                                    parents_filled_in = false;
                                }
                            });
                        if(parents_filled_in){
                            const start = input_date_shifted_days(info.start_base_event, info.start_offset);
                            const end = input_date_shifted_days(info.end_base_event, info.end_offset);
                            //e.html(`Period: ${format_date(start)} - ${format_date(end)}`)
                            d3.select(`#${id}_from`).html(format_date(start));
                            d3.select(`#${id}_to`).html(format_date(end));
                        }
                    }
                })
        }
        update_inputs();
        update_intervals();
        setInterval(() => {
            if(need_update) {
                update_inputs();
                update_intervals();
                update_url();
            }
            need_update = false;
        },50);        
        d3.selectAll("input").on("input", () => need_update = true);
    });
});



