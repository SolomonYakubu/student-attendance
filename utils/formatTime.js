const _24to12 = (time) => {
  let hour = time.split(":")[0];
  let minute = time.split(":")[1];
  let newHour;
  if (+hour >= 12) {
    newHour = +hour === 12 ? "12" : (+hour % 12).toString();
    return `${newHour}:${(minute < 10 && `0${minute}`) || minute} PM`;
  }
  if (+hour === 00) {
    newHour = "12";
    return `${newHour}:${(minute < 10 && `0${minute}`) || minute} AM`;
  }

  return `${time} AM`;
};

module.exports = {
  _24to12,
};
