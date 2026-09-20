/* Adrián Visual System · AVS 2.0
   Perceptual 15-rank colour system with strictly increasing lightness. */
window.ADRIAN_VISUAL_SYSTEM=Object.freeze({
  version:"2.0",
  scale:15,
  perceptualModel:"OKLCH lightness + verified sRGB relative luminance",
  ranks:Object.freeze([
    Object.freeze({level:1,name:"Umber",color:"#422522",surface:"#1A1714",band:"#291F1B",text:"#91817F",glow:"#91817F",oklchLightness:0.300,relativeLuminance:0.0260,meaning:"critical"}),
    Object.freeze({level:2,name:"Mahogany",color:"#512927",surface:"#1F1915",band:"#30211D",text:"#9A8382",glow:"#9A8382",oklchLightness:0.335,relativeLuminance:0.0348,meaning:"very-low"}),
    Object.freeze({level:3,name:"Oxblood",color:"#632D2A",surface:"#241A16",band:"#3A231F",text:"#A58583",glow:"#A58583",oklchLightness:0.370,relativeLuminance:0.0470,meaning:"low"}),
    Object.freeze({level:4,name:"Wine",color:"#762F32",surface:"#2B1B19",band:"#442423",text:"#B08688",glow:"#B08688",oklchLightness:0.405,relativeLuminance:0.0611,meaning:"weak"}),
    Object.freeze({level:5,name:"Rust",color:"#843729",surface:"#2F1D16",band:"#4B281E",text:"#B88B83",glow:"#B88B83",oklchLightness:0.440,relativeLuminance:0.0780,meaning:"building"}),
    Object.freeze({level:6,name:"Copper",color:"#904311",surface:"#33210E",band:"#512E12",text:"#BF9275",glow:"#BF9275",oklchLightness:0.475,relativeLuminance:0.0998,meaning:"transition"}),
    Object.freeze({level:7,name:"Amber",color:"#90570C",surface:"#33270D",band:"#51390F",text:"#BF9E72",glow:"#BF9E72",oklchLightness:0.510,relativeLuminance:0.1277,meaning:"developing"}),
    Object.freeze({level:8,name:"Olive",color:"#8B6B05",surface:"#312E0A",band:"#4F430C",text:"#BCA96E",glow:"#BCA96E",oklchLightness:0.545,relativeLuminance:0.1602,meaning:"midpoint"}),
    Object.freeze({level:9,name:"Moss",color:"#798136",surface:"#2B351A",band:"#454F25",text:"#B1B68A",glow:"#B1B68A",oklchLightness:0.580,relativeLuminance:0.2003,meaning:"competent"}),
    Object.freeze({level:10,name:"Emerald",color:"#57965A",surface:"#213C26",band:"#335A38",text:"#9EC29F",glow:"#9EC29F",oklchLightness:0.615,relativeLuminance:0.2458,meaning:"good"}),
    Object.freeze({level:11,name:"Teal",color:"#32A48F",surface:"#154037",band:"#206153",text:"#88CABE",glow:"#88CABE",oklchLightness:0.650,relativeLuminance:0.2921,meaning:"very-good"}),
    Object.freeze({level:12,name:"Azure",color:"#4AA7C8",surface:"#1C4149",band:"#2D6271",text:"#96CCDF",glow:"#96CCDF",oklchLightness:0.685,relativeLuminance:0.3326,meaning:"strong"}),
    Object.freeze({level:13,name:"Indigo",color:"#7AA5EC",surface:"#2C4054",band:"#466184",text:"#B2CBF4",glow:"#B2CBF4",oklchLightness:0.720,relativeLuminance:0.3710,meaning:"advanced"}),
    Object.freeze({level:14,name:"Violet",color:"#BB9EF0",surface:"#413E56",band:"#675E86",text:"#D8C7F6",glow:"#D8C7F6",oklchLightness:0.755,relativeLuminance:0.4131,meaning:"elite"}),
    Object.freeze({level:15,name:"Gold",color:"#E7BF57",surface:"#4F4925",band:"#7E6F36",text:"#F1DA9E",glow:"#F1DA9E",oklchLightness:0.820,relativeLuminance:0.5494,meaning:"maximum"})
  ]),
  semantics:Object.freeze({negative:"1-4",transition:"5-8",positive:"9-13",elite:14,maximum:15,reward:15}),
  usage:Object.freeze({scalar:"own-normalized-value",deltaPositive:10,deltaNegative:4,reward:15,ambient:"global-ai-rank-surface",actualSeries:"value-accent-solid-filled",targetSeries:"value-accent-dashed-hollow",rawUncalibrated:"neutral"}),
  guarantees:Object.freeze({accentLightnessStrictlyIncreasing:true,surfaceLightnessStrictlyIncreasing:true,bandLightnessStrictlyIncreasing:true})
});
