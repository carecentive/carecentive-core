const Permission = require("../models/Permission");

class PermissionService {

  /**
   * @param {*} permission 
   * @returns permission Instance
   */
  static async getByIdOrName(permission) {
    if(typeof permission === "number" && Number.isInteger(permission)) {
      return await Permission.query().findById(permission);
    }
    else if(typeof permission === "string") {
      return await Permission.query().findOne('name', permission)
    }
    return false;
  }
}

module.exports = PermissionService;